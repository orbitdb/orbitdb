const DocumentStore = async ({ OpLog, Database, ipfs, identity, address, name, access, directory, storage, meta, syncAutomatically, indexBy = '_id' }) => {
  const database = await Database({ OpLog, ipfs, identity, address, name, access, directory, storage, meta, syncAutomatically })

  const { addOperation, log } = database

  /**
   * Stores a document to the store.
   *
   * @param {Object} doc An object representing a key/value list of fields.
   * @returns {string} The hash of the new oplog entry.
   */
  const put = async (doc) => {
    const key = doc[indexBy]

    if (!key) { throw new Error(`The provided document doesn't contain field '${indexBy}'`) }

    return addOperation({ op: 'PUT', key, value: doc })
  }

  /**
   * Deletes a document from the store.
   *
   * @param {string} key The key of the doc to delete.
   * @returns {string} The hash of the new oplog entry.
   */
  const del = async (key) => {
    if (!await get(key)) { throw new Error(`No document with key '${key}' in the database`) }

    return addOperation({ op: 'DEL', key, value: null })
  }

  /**
   * Gets a document from the store by key.
   *
   * @param {string} key The key of the doc to get.
   * @returns {Object} The doc corresponding to key or null.
   */
  const get = async (key) => {
    for await (const doc of iterator()) {
      if (key === doc.key) {
        return doc
      }
    }
  }

  /**
   * Queries the document store for documents matching mapper filters.
   *
   * @param {function(Object)} findFn A function for querying for specific results.
   * @returns {Array} Found documents.
   */
  const query = async (findFn) => {
    const results = []

    for await (const doc of iterator()) {
      if (findFn(doc.value)) {
        results.push(doc.value)
      }
    }

    return results
  }

  const iterator = async function * ({ amount } = {}) {
    const keys = {}
    let count = 0
    for await (const entry of log.iterator()) {
      const { op, key, value } = entry.payload
      if (op === 'PUT' && !keys[key]) {
        keys[key] = true
        count++
        const hash = entry.hash
        yield { hash, key, value }
      } else if (op === 'DEL' && !keys[key]) {
        keys[key] = true
      }
      if (count >= amount) {
        break
      }
    }
  }

  const all = async () => {
    const values = []
    for await (const entry of iterator()) {
      values.unshift(entry)
    }
    return values
  }

  return {
    ...database,
    type: 'documentstore',
    put,
    del,
    get,
    iterator,
    query,
    indexBy,
    all
  }
}

export default DocumentStore
