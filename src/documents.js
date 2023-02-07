const DocumentStore = async ({ OpLog, Database, ipfs, identity, databaseId, accessController, storage, indexBy = '_id' }) => {
  const database = await Database({ OpLog, ipfs, identity, databaseId, accessController, storage })

  const { addOperation, log } = database

  /**
   * Stores a document to the store.
   *
   * @param {Object} doc An object representing a key/value list of fields.
   * @returns {string} The hash of the new oplog entry.
   */
  const put = async (doc) => {
    if (!doc[indexBy]) { throw new Error(`The provided document doesn't contain field '${indexBy}'`) }
    
    return addOperation({ op: 'PUT', key: doc[indexBy], value: doc })
  }

  /**
   * Deletes a document from the store.
   *
   * @param {string} key The key of the doc to delete.
   * @returns {string} The hash of the new oplog entry.
   */
  const del = async (key) => {
    if (!get(key)) { throw new Error(`No entry with key '${key}' in the database`) }
    
    return addOperation({ op: 'DEL', key, value: null })
  }

  /**
   * Gets a document from the store by key.
   *
   * @param {string} key The key of the doc to get.
   * @returns {Object} The doc corresponding to key or null.
   */
  const get = async (key) => {
    for await (const entry of iterator()) {
      const { key: k, value } = entry
      
      if (key === k) {
        return value  
      }
    }
    
    return null
  }
  
  /**
   * Queries the document store for documents matching mapper filters.
   *
   * @param {function(Object)} mapper A function for querying for specific results.
   * @returns {Array} Found documents.
   */
  const query = async (mapper) => {
    const results = []
    
    for await (const entry of iterator()) {
      if (Object.values(entry).find(mapper)) {
        results.push(entry.value)  
      }
    }

    return results
  }

  const iterator = async function * () {
    const keys = {}
    for await (const entry of log.traverse()) {
      const { op, key, value } = entry.payload
      if (op === 'PUT' && !keys[key]) {
        keys[key] = true
        yield { key, value }
      } else if (op === 'DEL' && !keys[key]) {
        keys[key] = true
      }
    }
  }

  return {
    ...database,
    type: 'documents',
    put,
    del,
    get,
    iterator,
    query
  }
}

export default DocumentStore
