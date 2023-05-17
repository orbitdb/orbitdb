/**
 * @module Database
 * @description
 * Database is the base class for OrbitDB data stores and handles all lower
 * level add operations and database sync-ing using IPFS.
 *
 * Database should be instantiated and initialized when implementing a
 * compatible datastore:
 * ```
 * const CustomDataStore = () => async ({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate }) => {
 *   const database = await Database({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate })
 *   const { addOperation, log } = database
 *
 *   const put = async (key, value) => {
 *     return addOperation({ op: 'ADD', key, value })
 *   }
 *
 *   const get = async (hash) => {
 *     const entry = await log.get(hash)
 *     return entry.payload.value
 *   }
 *
 *   return {
 *     ...database,
 *     type: 'custom-data-store',
 *     put,
 *     get
 *   }
 * }
 *
 * export default CustomDataStore
 * ```
 * The functions put and get are recommended but not mandatory. For example,
 * the Events data store uses a function called `add`.
 */
import { EventEmitter } from 'events'
import PQueue from 'p-queue'
import Sync from './sync.js'
import { Log, Entry } from './oplog/index.js'
import { ComposedStorage, LRUStorage, IPFSBlockStorage, LevelStorage } from './storage/index.js'
import pathJoin from './utils/path-join.js'

const defaultReferencesCount = 16
const defaultCacheSize = 1000

/**
 * Creates an instance of Database.
 * @function
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
 * @param {module:Storage} [params.headsStorage] A compatible storage
 * instance for storing log heads. Defaults to ComposedStorage.
 * @param {module:Storage} [params.entryStorage] A compatible storage instance
 * for storing log entries. Defaults to ComposedStorage.
 * @param {module:Storage} [params.indexStorage] A compatible storage
 * instance for storing an index of log entries. Defaults to ComposedStorage.
 * @param {number} [params.referencesCount=16]  The maximum distance between
 * references to other entries.
 * @param {boolean} [params.syncAutomatically=false] If true, sync databases
 * automatically. Otherwise, false.
 * @param {function} [params.onUpdate] A function callback. Fired when an
 * entry is added to the oplog.
 * @return {module:Database~Database} An instance of Database.
 * @instance
 */
const Database = async ({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate }) => {
  /**
   * @namespace module:Database~Database
   * @description The instance returned by {@link module:Database~Database}.
   */

  /**
   * Event fired when an update occurs.
   * @event module:Database~Database#update
   * @param {module:Entry} entry An entry.
   * @example
   * database.events.on('update', (entry) => ...)
   */

  /**
   * Event fired when a close occurs.
   * @event module:Database~Database#close
   * @example
   * database.events.on('close', () => ...)
   */

  /**
   * Event fired when a drop occurs.
   * @event module:Database~Database#drop
   * @example
   * database.events.on('drop', () => ...)
   */

  directory = pathJoin(directory || './orbitdb', `./${address}/`)
  meta = meta || {}
  referencesCount = referencesCount || defaultReferencesCount

  entryStorage = entryStorage || await ComposedStorage(
    await LRUStorage({ size: defaultCacheSize }),
    await IPFSBlockStorage({ ipfs, pin: true })
  )

  headsStorage = headsStorage || await ComposedStorage(
    await LRUStorage({ size: defaultCacheSize }),
    await LevelStorage({ path: pathJoin(directory, '/log/_heads/') })
  )

  indexStorage = indexStorage || await ComposedStorage(
    await LRUStorage({ size: defaultCacheSize }),
    await LevelStorage({ path: pathJoin(directory, '/log/_index/') })
  )

  const log = await Log(identity, { logId: address, access, entryStorage, headsStorage, indexStorage })

  /**
   * Event emitter that emits updates.
   * @name events
   * @†ype EventEmitter
   * @fires update when an entry is added to the database.
   * @fires close When the database is closed.
   * @fires drop When the database is dropped.
   * @memberof module:Database~Database
   * @instance
   */
  const events = new EventEmitter()

  const queue = new PQueue({ concurrency: 1 })

  /**
   * Adds an operation to the oplog.
   * @function addOperation
   * @param {*} op Some operation to add to the oplog.
   * @return {string} The hash of the operation.
   * @memberof module:Database~Database
   * @instance
   * @async
   */
  const addOperation = async (op) => {
    const task = async () => {
      const entry = await log.append(op, { referencesCount })
      await sync.add(entry)
      if (onUpdate) {
        await onUpdate(log, entry)
      }
      events.emit('update', entry)
      return entry.hash
    }
    const hash = await queue.add(task)
    await queue.onIdle()
    return hash
  }

  const applyOperation = async (bytes) => {
    const task = async () => {
      const entry = await Entry.decode(bytes)
      if (entry) {
        const updated = await log.joinEntry(entry)
        if (updated) {
          if (onUpdate) {
            await onUpdate(log, entry)
          }
          events.emit('update', entry)
        }
      }
    }
    await queue.add(task)
  }

  /**
   * Closes the database, stopping sync and closing the oplog.
   * @memberof module:Database~Database
   * @instance
   * @async
   */
  const close = async () => {
    await sync.stop()
    await queue.onIdle()
    await log.close()
    events.emit('close')
  }

  /**
   * Drops the database, clearing the oplog.
   * @memberof module:Database~Database
   * @instance
   * @async
   */
  const drop = async () => {
    await queue.onIdle()
    await log.clear()
    events.emit('drop')
  }

  /**
   * Starts the [Sync protocol]{@link module:Sync~Sync}.
   *
   * Sync protocol exchanges OpLog heads (latest known entries) between peers
   * when they connect.
   * @memberof module:Database~Database
   * @instance
   * @async
   */
  const sync = await Sync({ ipfs, log, events, onSynced: applyOperation, start: syncAutomatically })

  return {
    address,
    name,
    identity,
    meta,
    close,
    drop,
    addOperation,
    log,
    sync,
    peers: sync.peers,
    events,
    access
  }
}

export default Database
