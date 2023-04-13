/** @module Database */
import { EventEmitter } from 'events'
import PQueue from 'p-queue'
import Sync from './sync.js'
import { Log, Entry } from './oplog/index.js'
import { ComposedStorage, LRUStorage, IPFSBlockStorage, LevelStorage } from './storage/index.js'
import pathJoin from './utils/path-join.js'

const defaultReferencesCount = 16
const defaultCacheSize = 1000

const Database = async ({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate }) => {
  /**
   * @namespace module:Database~Database
   * @description The instance returned by {@link module:Database}.
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

  const events = new EventEmitter()
  const queue = new PQueue({ concurrency: 1 })

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

  const close = async () => {
    await sync.stop()
    await queue.onIdle()
    await log.close()
    events.emit('close')
  }

  const drop = async () => {
    await queue.onIdle()
    await log.clear()
    events.emit('drop')
  }

  // Start the Sync protocol
  // Sync protocol exchanges OpLog heads (latest known entries) between peers when they connect
  // Sync emits 'join', 'leave' and 'error' events through the given event emitter
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
