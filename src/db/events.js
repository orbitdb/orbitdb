/**
 * @namespace Database-Events
 * @memberof module:Database
 * @description Events database.
 */
import Database from '../database.js'

/**
 * Creates an instance of Events.
 * @callback Events
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
 * @memberof module:Database.Database-Events
 */

/**
 * Defines an Events database.
 * @return {module:Database.Database-Events} A Events function.
 * @memberof module:Database
 */
const Events = () => async ({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate }) => {
  const database = await Database({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate })

  const { addOperation, log } = database

  /**
   * Adds an event to the store.
   * @function
   * @param {*} value The event to be added.
   * @return {string} The hash of the new oplog entry.
   * @memberof module:Database.Database-Events
   * @instance
   */
  const add = async (value) => {
    return addOperation({ op: 'ADD', key: null, value })
  }

  /**
   * Gets an event from the store by hash.
   * @function
   * @param {string} hash The hash of the event to get.
   * @return {*} The value corresponding to hash or null.
   * @memberof module:Database.Database-Events
   * @instance
   */
  const get = async (hash) => {
    const entry = await log.get(hash)
    return entry.payload.value
  }

  /**
   * Iterates over events.
   * @function
   * @param {Object} [filters={}] Various filters to apply to the iterator.
   * @param {string} [filters.gt] All events which are greater than the
   * given hash.
   * @param {string} [filters.gte] All events which are greater than or equal
   * to the given hash.
   * @param {string} [filters.lt] All events which are less than the given
   * hash.
   * @param {string} [filters.lte] All events which are less than or equal to
   * the given hash.
   * @param {string} [filters.amount=-1] The number of results to fetch.
   * @yields [string, string] The next event as hash/value.
   * @memberof module:Database.Database-Events
   * @instance
   */
  const iterator = async function * ({ gt, gte, lt, lte, amount } = {}) {
    const it = log.iterator({ gt, gte, lt, lte, amount })
    for await (const event of it) {
      const hash = event.hash
      const value = event.payload.value
      yield { hash, value }
    }
  }

  /**
   * Returns all events.
   * @function
   * @return [][string, string] An array of events as hash/value entries.
   * @memberof module:Database.Database-Events
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
    type: 'events',
    add,
    get,
    iterator,
    all
  }
}

export default Events
