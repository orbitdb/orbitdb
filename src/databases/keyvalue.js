/**
 * @namespace Databases-KeyValue
 * @memberof module:Databases
 * @description
 * Key-Value database.
 *
 * @augments module:Databases~Database
 */
import Database from '../database.js'

const type = 'keyvalue'

/**
 * Defines an KeyValue database.
 * @return {module:Databases.Databases-KeyValue} A KeyValue function.
 * @memberof module:Databases
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
   * @memberof module:Databases.Databases-KeyValue
   * @instance
   */
  const put = async (key, value) => {
    return addOperation({ op: 'PUT', key, value })
  }

  /**
   * Deletes a key/value pair from the store.
   * @function
   * @param {string} key The key of the key/value pair to delete.
   * @memberof module:Databases.Databases-KeyValue
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
   * @memberof module:Databases.Databases-KeyValue
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
   * @memberof module:Databases.Databases-KeyValue
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
   * @memberof module:Databases.Databases-KeyValue
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
    set: put, // Alias for put()
    del,
    get,
    iterator,
    all
  }
}

KeyValue.type = type

export default KeyValue
