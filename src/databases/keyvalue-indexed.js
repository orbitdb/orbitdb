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
  const indexedEntries = await LevelStorage({ path: pathJoin(indexDirectory, '/_indexedEntries/'), valueEncoding })

  const _updateIndex = async (log, entry) => {
    const keys = {}
    const toBeIndexed = {}
    const latest = entry.hash

    // Function to check if a hash is in the entry index
    const isIndexed = async (hash) => (await indexedEntries.get(hash)) === true

    // Function to decide when the log traversal should be stopped
    const shoudStopTraverse = async (entry) => {
      // Go through the nexts of an entry and if any is not yet
      // indexed, add it to the list of entries-to-be-indexed
      for await (const hash of entry.next) {
        if (!(await isIndexed(hash))) {
          toBeIndexed[hash] = true
        }
      }
      // If the to-be-indexed list is empty, we don't have nexts anymore to process
      const nextsAreIndexed = Object.keys(toBeIndexed).length === 0
      // If the latest entry and all its nexts are indexed, we're done
      return await isIndexed(latest) && nextsAreIndexed
    }

    // Traverse the log and stop when everything has been processed
    for await (const entry of log.traverse(null, shoudStopTraverse)) {
      const { hash, payload } = entry
      // If an entry is not yet indexed, process it
      if (!(await isIndexed(hash))) {
        const { op, key } = payload
        if (op === 'PUT' && !keys[key]) {
          keys[key] = true
          await index.put(key, entry)
          await indexedEntries.put(hash, true)
        } else if (op === 'DEL') {
          keys[key] = true
          await index.del(key)
          await indexedEntries.put(hash, true)
        }
        // Remove the entry (hash) from the list of to-be-indexed entries
        delete toBeIndexed[hash]
      }
    }
  }

  // Create the underlying KeyValue database
  const keyValueStore = await KeyValue()({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate: _updateIndex })

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
    await index.close()
    await indexedEntries.close()
    await keyValueStore.close()
  }

  /**
   * Drops all records from the index and underlying storage.
   */
  const drop = async () => {
    await index.clear()
    await indexedEntries.clear()
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
