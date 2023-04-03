import LevelStorage from '../storage/level.js'
import { KeyValue } from './index.js'
import pathJoin from '../utils/path-join.js'
import PQueue from 'p-queue'

const valueEncoding = 'json'

const KeyValuePersisted = async ({ OpLog, Database, ipfs, identity, address, name, access, directory, storage, meta }) => {
  const keyValueStore = await KeyValue({ OpLog, Database, ipfs, identity, address, name, access, directory, storage, meta })
  const { events, log } = keyValueStore

  const queue = new PQueue({ concurrency: 1 })

  directory = pathJoin(directory || './orbitdb', `./${address}/_index/`)
  const index = await LevelStorage({ path: directory, valueEncoding })

  let latestOplogHash

  const updateIndex = (index) => async (entry) => {
    const keys = {}

    for await (const entry of log.iterator({ gt: latestOplogHash })) {
      const { op, key, value } = entry.payload

      if (op === 'PUT' && !keys[key]) {
        keys[key] = true
        await index.put(key, value)
      } else if (op === 'DEL' && !keys[key]) {
        keys[key] = true
        await index.del(key)
      }
    }
    latestOplogHash = entry.hash
  }

  const get = async (key) => {
    await queue.onIdle()
    const value = await index.get(key)
    if (value) {
      return value
    }
    return keyValueStore.get(key)
  }

  const iterator = async function * ({ amount } = {}) {
    await queue.onIdle()
    for await (const { hash, key, value } of keyValueStore.iterator({ amount })) {
      yield { hash, key, value }
    }
  }

  const task = async () => {
    await queue.add(updateIndex(index))
  }

  const close = async () => {
    events.off('update', task)
    await queue.onIdle()
    await index.close()
    await keyValueStore.close()
  }

  // TOD: rename to clear()
  const drop = async () => {
    events.off('update', task)
    await queue.onIdle()
    await index.clear()
    await keyValueStore.drop()
  }

  // Listen for update events from the database and update the index on every update
  events.on('update', task)

  return {
    ...keyValueStore,
    get,
    iterator,
    close,
    drop
  }
}

export default KeyValuePersisted
