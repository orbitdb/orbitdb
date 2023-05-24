/**
 * @namespace Database-Documents
 * @memberof module:Database
 * @description Documents database.
 * @example <caption>Create documents db with default options</caption>
 * import { create } from 'IPFS'
 *
 * const ipfs = create()
 * const Partial = Documents()
 * const documents = await Partial({ ipfs })
 * @example <caption>Create documents db with custom index</caption>
 * import { create } from 'IPFS'
 *
 * const ipfs = create()
 * const options = { indexBy: 'myCustomId'}
 * const Partial = Documents(options)
 * const documents = await Partial({ ipfs })
 */
import Database from '../database.js'

const DefaultOptions = { indexBy: '_id' }

/**
 * Creates an instance of Documents.
 * @callback Documents
 * @param {Object} params One or more parameters for configuring Database.
 * @param {IPFS} params.ipfs An IPFS instance.
 * @param {Identity} [params.identity] An Identity instance.
 * @param {string} [params.address] The address of the database.
 * @param {string} [params.name] The name of the database.
 * @param {module:AccessControllers} [params.access] An AccessController
 * instance.
 * @param {string} [params.directory] A location for storing Database-related
 * data. Defaults to ./orbitdb/[params.address].
 * @param {*} [params.meta={}] The database's metadata.
 * @param {module:Storage} [params.headsStorage=[ComposedStorage]{@link module:Storage.Storage-Composed}] A compatible storage instance for storing
 * log heads. Defaults to ComposedStorage(LRUStorage, IPFSBlockStorage).
 * @param {module:Storage} [params.entryStorage=[ComposedStorage]{@link module:Storage.Storage-Composed}] A compatible storage instance for storing
 * log entries. Defaults to ComposedStorage(LRUStorage, LevelStorage).
 * @param {module:Storage} [params.indexStorage=[ComposedStorage]{@link module:Storage.Storage-Composed}] A compatible storage instance for storing an " index of log entries. Defaults to ComposedStorage(LRUStorage, LevelStorage).
 * @param {number} [params.referencesCount]  The maximum distance between
 * references to other entries.
 * @param {boolean} [params.syncAutomatically=false] If true, sync databases
 * automatically. Otherwise, false.
 * @param {function} [params.onUpdate] A function callback. Fired when an
 * entry is added to the oplog.
 * @function
 * @instance
 * @async
 * @memberof module:Database.Database-Documents
 */

/**
 * Defines a Documents database.
 * @param {Object} options Various options for configuring the Document store.
 * @param {string} [params.indexBy=_id] An index.
 * @return {module:Database.Database-Documents} A Documents function.
 * @memberof module:Database
 */
const Documents = ({ indexBy } = DefaultOptions) => async ({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate }) => {
  const database = await Database({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically })

  const { addOperation, log } = database

  /**
   * Stores a document to the store.
   * @function
   * @param {Object} doc An object representing a key/value list of fields.
   * @return {string} The hash of the new oplog entry.
   * @memberof module:Database.Database-Documents
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
   * @memberof module:Database.Database-Documents
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
   * @memberof module:Database.Database-Documents
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
   * @return {Array} Found documents.
   * @memberof module:Database.Database-Documents
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
   * @memberof module:Database.Database-Documents
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
   * @memberof module:Database.Database-Documents
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
    type: 'documents',
    put,
    del,
    get,
    iterator,
    query,
    indexBy,
    all
  }
}

export default Documents
