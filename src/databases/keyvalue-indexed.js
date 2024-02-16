/**
 * @namespace Databases-KeyValueIndexed
 * @memberof module:Databases
 * @description
 * Key-Value database that uses an index in order to provide fast queries.
 *
 * Key-value pairs are stored to the configured storage.
 * @example <caption>Specify a custom storage</caption>
 * import { createHelia } from 'helia'
 * import { createOrbitDB, KeyValueIndexed, IPFSBlockStorage } from 'orbitdb'
 *
 * const ipfs = createHelia()
 * const storage = await IPFSBlockStorage({ ipfs })
 * const orbitdb = await createOrbitDB({ ipfs })
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
 * Defines an index for a KeyValue database.
 * @param {string} [directory] A location for storing the index-related data
 * @return {Index} A Index function.
 */
const Index = ({ directory } = {}) => async () => {
  const index = await LevelStorage({ path: directory, valueEncoding })
  const indexedEntries = await LevelStorage({ path: pathJoin(directory, '/_indexedEntries/'), valueEncoding })

  const update = async (log, entry) => {
    const keys = new Set()
    const toBeIndexed = new Set()
    const latest = entry.hash

    // Function to check if a hash is in the entry index
    const isIndexed = async (hash) => (await indexedEntries.get(hash)) === true
    const isNotIndexed = async (hash) => !(await isIndexed(hash))

    // Function to decide when the log traversal should be stopped
    const shoudStopTraverse = async (entry) => {
      // Go through the nexts of an entry and if any is not yet
      // indexed, add it to the list of entries-to-be-indexed
      for await (const hash of entry.next) {
        if (await isNotIndexed(hash)) {
          toBeIndexed.add(hash)
        }
      }
      // If the latest entry and all its nexts are indexed and to-be-indexed list is empty,
      // we don't have anything more to process, so return true to stop the traversal
      return await isIndexed(latest) && toBeIndexed.size === 0
    }

    // Traverse the log and stop when everything has been processed
    for await (const entry of log.traverse(null, shoudStopTraverse)) {
      const { hash, payload } = entry
      // If an entry is not yet indexed, process it
      if (await isNotIndexed(hash)) {
        const { op, key } = payload
        if (op === 'PUT' && !keys.has(key)) {
          keys.add(key)
          await index.put(key, entry)
          await indexedEntries.put(hash, true)
        } else if (op === 'DEL' && !keys.has(key)) {
          keys.add(key)
          await index.del(key)
          await indexedEntries.put(hash, true)
        }
        // Remove the entry (hash) from the list of to-be-indexed entries
        toBeIndexed.delete(hash)
      }
    }
  }

  /**
   * Closes the index and its storages.
   */
  const close = async () => {
    await index.close()
    await indexedEntries.close()
  }

  /**
   * Drops all records from the index and its storages.
   */
  const drop = async () => {
    await index.clear()
    await indexedEntries.clear()
  }

  return {
    get: index.get,
    iterator: index.iterator,
    update,
    close,
    drop
  }
}

/**
 * Defines a KeyValueIndexed database.
 * @param {module:Storage} [storage=LevelStorage] A compatible storage where
 * the key/value pairs are indexed.
 * @return {module:Databases.Databases-KeyValueIndexed} A KeyValueIndexed
 * function.
 * @memberof module:Databases
 */
const KeyValueIndexed = () => async ({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate }) => {
  // Set up the directory for an index
  directory = pathJoin(directory || './orbitdb', `./${address}/_index/`)

  // Set up the index
  const index = await Index({ directory })()

  // Set up the underlying KeyValue database
  const keyValueStore = await KeyValue()({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate: index.update })

  /**
   * Gets a value from the store by key.
   * @function
   * @param {string} key The key of the value to get.
   * @return {*} The value corresponding to key or null.
   * @memberof module:Databases.Databases-KeyValueIndexed
   * @instance
   */
  const get = async (key) => {
    const entry = await index.get(key)
    if (entry) {
      return entry.payload.value
    }
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
    const it = index.iterator({ amount, reverse: true })
    for await (const record of it) {
      // 'index' is a LevelStorage that returns a [key, value] pair
      const entry = record[1]
      const { key, value } = entry.payload
      const hash = entry.hash
      yield { key, value, hash }
    }
  }

  /**
   * Closes the index and underlying storage.
   */
  const close = async () => {
    await keyValueStore.close()
    await index.close()
  }

  /**
   * Drops all records from the index and underlying storage.
   */
  const drop = async () => {
    await keyValueStore.drop()
    await index.drop()
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
