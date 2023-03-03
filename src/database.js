import { EventEmitter } from 'events'
import PQueue from 'p-queue'
import Path from 'path'
import Sync from './sync.js'
import { IPFSBlockStorage, LevelStorage } from './storage/index.js'

const defaultPointerCount = 16

const Database = async ({ OpLog, ipfs, identity, address, name, accessController, directory, storage, headsStorage, pointerCount }) => {
  const { Log, Entry } = OpLog

  const entryStorage = storage || await IPFSBlockStorage({ ipfs, pin: true })

  directory = Path.join(directory || './orbitdb', `./${address.path}/`)
  headsStorage = headsStorage || await LevelStorage({ path: Path.join(directory, '/log/_heads/') })

  const log = await Log(identity, { logId: address.toString(), access: accessController, entryStorage, headsStorage })

  // const indexStorage = await LevelStorage({ path: Path.join(directory, '/log/_index/') })
  // const log = await Log(identity, { logId: address.toString(), access: accessController, entryStorage, headsStorage, indexStorage })

  const events = new EventEmitter()
  const queue = new PQueue({ concurrency: 1 })

  pointerCount = pointerCount || defaultPointerCount

  const addOperation = async (op) => {
    const task = async () => {
      const entry = await log.append(op, { pointerCount })
      await syncProtocol.publish(entry)
      events.emit('update', entry)
      return entry.hash
    }
    return queue.add(task)
  }

  const applyOperation = async (bytes) => {
    const task = async () => {
      const entry = await Entry.decode(bytes)
      if (entry) {
        const updated = await log.joinEntry(entry)
        if (updated) {
          events.emit('update', entry)
        }
      }
    }
    await queue.add(task)
  }

  const close = async () => {
    await syncProtocol.stop()
    await queue.onIdle()
    await log.close()
    events.emit('close')
  }

  // TODO: rename to clear()
  const drop = async () => {
    await queue.onIdle()
    await log.clear()
    events.emit('drop')
  }

  // Start the Sync protocol
  // Sync protocol exchanges OpLog heads (latest known entries) between peers when they connect
  // Sync emits 'join', 'leave' and 'error' events through the given event emitter
  const syncProtocol = await Sync({ ipfs, log, events, sync: applyOperation })

  return {
    address,
    name,
    identity,
    close,
    drop,
    addOperation,
    log,
    sync: syncProtocol,
    peers: syncProtocol.peers,
    events
  }
}

export default Database
