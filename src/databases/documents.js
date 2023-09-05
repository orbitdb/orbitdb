/**
 * @namespace Databases-Documents
 * @memberof module:Databases
 * @description Documents database.
 * @example <caption>Create documents db with custom index</caption>
 * import { create } from 'IPFS'
 * import { OrbitDB, Documents } from 'orbitdb'
 *
 * const ipfs = create()
 * const orbitdb = await OrbitDB({ ipfs })
 * const db = await orbitdb.open('my-docs', { Database: Documents({ indexBy: 'myCustomId'} ) }
 *
 * @augments module:Databases~Database
 */
import Database from '../database.js'

const type = 'documents'

const DefaultOptions = { indexBy: '_id' }

/**
 * Defines a Documents database.
 * @param {Object} options Various options for configuring the Document store.
 * @param {string} [options.indexBy=_id] An index.
 * @return {module:Databases.Databases-Documents} A Documents function.
 * @memberof module:Databases
 */
const Documents = ({ indexBy } = DefaultOptions) => async ({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate }) => {
  const database = await Database({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically })

  const { addOperation, log } = database

  /**
   * Stores a document to the store.
   * @function
   * @param {Object} doc An object representing a key/value list of fields.
   * @return {string} The hash of the new oplog entry.
   * @memberof module:Databases.Databases-Documents
   * @instance
   */
  const put = async (doc) => {
    const key = doc[indexBy]

    if (!key) { throw new Error(`The provided document doesn't contain field '${indexBy}'`) }

    return addOperation({ op: 'PUT', key, value: doc })
  }

  /**
   * Deletes a document from the store.
   * @function
   * @param {string} key The key of the doc to delete.
   * @return {string} The hash of the new oplog entry.
   * @memberof module:Databases.Databases-Documents
   * @instance
   */
  const del = async (key) => {
    if (!await get(key)) { throw new Error(`No document with key '${key}' in the database`) }

    return addOperation({ op: 'DEL', key, value: null })
  }

  /**
   * Gets a document from the store by key.
   * @function
   * @param {string} key The key of the doc to get.
   * @return {Object} The doc corresponding to key or null.
   * @memberof module:Databases.Databases-Documents
   * @instance
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
   * @function
   * @param {function(Object)} findFn A function for querying for specific
   * results.
   *
   * The findFn function's signature takes the form `function(doc)` where doc
   * is a document's value property. The function should return true if the
   * document should be included in the results, false otherwise.
   * @return {Array} Found documents.
   * @memberof module:Databases.Databases-Documents
   * @instance
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

  /**
   * Iterates over documents.
   * @function
   * @param {Object} [filters={}] Various filters to apply to the iterator.
   * @param {string} [filters.amount=-1] The number of results to fetch.
   * @yields [string, string, string] The next document as hash/key/value.
   * @memberof module:Databases.Databases-Documents
   * @instance
   */
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

  /**
   * Returns all documents.
   * @function
   * @return [][string, string, string] An array of documents as hash/key
   * value entries.
   * @memberof module:Databases.Databases-Documents
   * @instance
   */
  const all = async () => {
    const values = []
    for await (const entry of iterator()) {
      values.unshift(entry)
    }
    return values
  }

  return {
    ...database,
    type,
    put,
    del,
    get,
    iterator,
    query,
    indexBy,
    all
  }
}

Documents.type = type

export default Documents
