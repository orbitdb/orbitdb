/**
 * @namespace Database-KeyValue
 * @memberof module:Database
 * @description KeyValue database.
 */
import Database from '../database.js'

/**
 * Creates an instance of KeyValue.
 * @callback KeyValue
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
 * @memberof module:Database.Database-KeyValue
 */

/**
 * Defines an KeyValue database.
 * @return {module:Database.Database-KeyValue} A KeyValue function.
 * @memberof module:Database
 */
const KeyValue = () => async ({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate }) => {
  const database = await Database({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate })

  const { addOperation, log } = database

  /**
   * Stores a key/value pair to the store.
   * @function
   * @param {string} key The key to store.
   * @param {*} value The value to store.
   * @return {string} The hash of the new oplog entry.
   * @memberof module:Database.Database-KeyValue
   * @instance
   */
  const put = async (key, value) => {
    return addOperation({ op: 'PUT', key, value })
  }

  /**
   * Deletes a key/value pair from the store.
   * @function
   * @param {string} key The key of the key/value pair to delete.
   * @memberof module:Database.Database-KeyValue
   * @instance
   */
  const del = async (key) => {
    return addOperation({ op: 'DEL', key, value: null })
  }

  /**
   * Gets a value from the store by key.
   * @function
   * @param {string} key The key of the value to get.
   * @return {*} The value corresponding to key or null.
   * @memberof module:Database.Database-KeyValue
   * @instance
   */
  const get = async (key) => {
    for await (const entry of log.traverse()) {
      const { op, key: k, value } = entry.payload
      if (op === 'PUT' && k === key) {
        return value
      } else if (op === 'DEL' && k === key) {
        return
      }
    }
  }

  /**
   * Iterates over keyvalue pairs.
   * @function
   * @param {Object} [filters={}] Various filters to apply to the iterator.
   * @param {string} [filters.amount=-1] The number of results to fetch.
   * @yields [string, string, string] The next key/value as key/value/hash.
   * @memberof module:Database.Database-KeyValue
   * @instance
   */
  const iterator = async function * ({ amount } = {}) {
    const keys = {}
    let count = 0
    for await (const entry of log.traverse()) {
      const { op, key, value } = entry.payload
      if (op === 'PUT' && !keys[key]) {
        keys[key] = true
        count++
        const hash = entry.hash
        yield { key, value, hash }
      } else if (op === 'DEL' && !keys[key]) {
        keys[key] = true
      }
      if (count >= amount) {
        break
      }
    }
  }

  /**
   * Returns all key/value pairs.
   * @function
   * @return [][string, string, string] An array of key/value pairs as
   * key/value/hash entries.
   * @memberof module:Database.Database-KeyValue
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
    type: 'keyvalue',
    put,
    set: put, // Alias for put()
    del,
    get,
    iterator,
    all
  }
}

export default KeyValue
