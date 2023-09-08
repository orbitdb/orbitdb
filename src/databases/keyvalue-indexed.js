/**
 * @namespace Databases-KeyValueIndexed
 * @memberof module:Databases
 * @description
 * Key-Value database that uses an index in order to provide fast queries.
 *
 * Key-value pairs are stored to the configured storage.
 * @example <caption>Specify a custom storage</caption>
 * import { create } from 'IPFS'
 * import { OrbitDB, KeyValueIndexed, IPFSBlockStorage } from 'orbitdb'
 *
 * const ipfs = create()
 * const storage = await IPFSBlockStorage({ ipfs })
 * const orbitdb = await OrbitDB({ ipfs })
 * const db = await orbitdb.open('my-kv', { Database: KeyValueIndexed({ storage }) })
 *
 * @augments module:Databases~Database
 * @augments module:Databases.Databases-KeyValue
 */
import KeyValue from './keyvalue.js'
import LevelStorage from '../storage/level.js'
import pathJoin from '../utils/path-join.js'

const valueEncoding = 'json'

/**
 * Defines a KeyValueIndexed database.
 * @param {module:Storage} [storage=LevelStorage] A compatible storage where
 * the key/value pairs are indexed.
 * @return {module:Databases.Databases-KeyValueIndexed} A KeyValueIndexed
 * function.
 * @memberof module:Databases
 */
const KeyValueIndexed = ({ storage } = {}) => async ({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate }) => {
  const indexDirectory = pathJoin(directory || './orbitdb', `./${address}/_index/`)
  const index = storage || await LevelStorage({ path: indexDirectory, valueEncoding })

  let latestOplogHash

  const _updateIndex = async (log, entry) => {
    const keys = {}
    const it = await log.iterator({ gt: latestOplogHash })

    for await (const entry of it) {
      const { op, key, value } = entry.payload

      if (op === 'PUT' && !keys[key]) {
        keys[key] = true
        await index.put(key, value)
      } else if (op === 'DEL' && !keys[key]) {
        keys[key] = true
        await index.del(key)
      }
    }

    latestOplogHash = entry ? entry.hash : null
  }

  // Create the underlying KeyValue database
  const keyValueStore = await KeyValue()({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate: _updateIndex })

  // Compute the index
  await _updateIndex(keyValueStore.log)

  /**
   * Gets a value from the store by key.
   * @function
   * @param {string} key The key of the value to get.
   * @return {*} The value corresponding to key or null.
   * @memberof module:Databases.Databases-KeyValueIndexed
   * @instance
   */
  const get = async (key) => {
    const value = await index.get(key)
    if (value) {
      return value
    }
    return keyValueStore.get(key)
  }

  /**
   * Iterates over keyvalue pairs.
   * @function
   * @param {Object} [filters={}] Various filters to apply to the iterator.
   * @param {string} [filters.amount=-1] The number of results to fetch.
   * @yields [string, string, string] The next key/value as key/value/hash.
   * @memberof module:Databases.Databases-KeyValueIndexed
   * @instance
   */
  const iterator = async function * ({ amount } = {}) {
    const it = keyValueStore.iterator({ amount })
    for await (const { key, value, hash } of it) {
      yield { key, value, hash }
    }
  }

  /**
   * Closes the index and underlying storage.
   */
  const close = async () => {
    await index.close()
    await keyValueStore.close()
  }

  /**
   * Drops all records from the index and underlying storage.
   */
  const drop = async () => {
    await index.clear()
    await keyValueStore.drop()
  }

  return {
    ...keyValueStore,
    get,
    iterator,
    close,
    drop
  }
}

KeyValueIndexed.type = 'keyvalue'

export default KeyValueIndexed
