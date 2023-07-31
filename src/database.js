/**
 * @module Database
 * @description
 * Database is the base class for OrbitDB data stores and handles all lower
 * level add operations and database sync-ing using IPFS.
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
 * @return {module:Databases~Database} An instance of Database.
 * @instance
 */
const Database = async ({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate }) => {
  /**
   * @namespace module:Databases~Database
   * @description The instance returned by {@link module:Database~Database}.
   */

  /**
   * Event fired when an update occurs.
   * @event module:Databases~Database#update
   * @param {module:Entry} entry An entry.
   * @example
   * database.events.on('update', (entry) => ...)
   */

  /**
   * Event fired when a close occurs.
   * @event module:Databases~Database#close
   * @example
   * database.events.on('close', () => ...)
   */

  /**
   * Event fired when a drop occurs.
   * @event module:Databases~Database#drop
   * @example
   * database.events.on('drop', () => ...)
   */

  /** Events inherited from Sync */

  /**
   * Event fired when when a peer has connected to the database.
   * @event module:Databases~Database#join
   * @param {PeerID} peerId PeerID of the peer who connected
   * @param {Entry[]} heads An array of Log entries
   * @example
   * database.events.on('join', (peerID, heads) => ...)
   */

  /**
   * Event fired when a peer has disconnected from the database.
   * @event module:Databases~Database#leave
   * @param {PeerID} peerId PeerID of the peer who disconnected
   * @example
   * database.events.on('leave', (peerID) => ...)
   */

  directory = pathJoin(directory || './orbitdb', `./${address}/`)
  meta = meta || {}
  referencesCount = Number(referencesCount) > -1 ? referencesCount : defaultReferencesCount

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

  const events = new EventEmitter()

  const queue = new PQueue({ concurrency: 1 })

  /**
   * Adds an operation to the oplog.
   * @function addOperation
   * @param {*} op Some operation to add to the oplog.
   * @return {string} The hash of the operation.
   * @memberof module:Databases~Database
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
   * @memberof module:Databases~Database
   * @instance
   * @async
   */
  const close = async () => {
    await sync.stop()
    await queue.onIdle()
    await log.close()
    if (access && access.close) {
      await access.close()
    }
    events.emit('close')
  }

  /**
   * Drops the database, clearing the oplog.
   * @memberof module:Databases~Database
   * @instance
   * @async
   */
  const drop = async () => {
    await queue.onIdle()
    await log.clear()
    if (access && access.drop) {
      await access.drop()
    }
    events.emit('drop')
  }

  const sync = await Sync({ ipfs, log, events, onSynced: applyOperation, start: syncAutomatically })

  return {
    /**
     * The address of the database.
     * @†ype string
     * @memberof module:Databases~Database
     * @instance
     */
    address,
    /**
     * The name of the database.
     * @†ype string
     * @memberof module:Databases~Database
     * @instance
     */
    name,
    identity,
    meta,
    close,
    drop,
    addOperation,
    /**
     * The underlying [operations log]{@link module:Log~Log} of the database.
     * @†ype {module:Log~Log}
     * @memberof module:Databases~Database
     * @instance
     */
    log,
    /**
     * A [sync]{@link module:Sync~Sync} instance of the database.
     * @†ype {module:Sync~Sync}
     * @memberof module:Databases~Database
     * @instance
     */
    sync,
    /**
     * Set of currently connected peers for this Database instance.
     * @†ype Set
     * @memberof module:Databases~Database
     * @instance
     */
    peers: sync.peers,
    /**
     * Event emitter that emits Database changes. See Events section for details.
     * @†ype EventEmitter
     * @memberof module:Databases~Database
     * @instance
     */
    events,
    /**
     * The [access controller]{@link module:AccessControllers} instance of the database.
     * @memberof module:Databases~Database
     * @instance
     */
    access
  }
}

export default Database
