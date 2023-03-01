import LevelStorage from '../storage/level.js'
import PQueue from 'p-queue'

const valueEncoding = 'json'

const KeyValuePersisted = async ({ KeyValue, OpLog, Database, ipfs, identity, databaseId, accessController, storage }) => {
  const keyValueStore = await KeyValue({ OpLog, Database, ipfs, identity, databaseId, accessController, storage })
  const { events, log } = keyValueStore

  const queue = new PQueue({ concurrency: 1 })

  const path = `./${identity.id}/${databaseId}/_index`
  const index = await LevelStorage({ path, valueEncoding: 'json' })
  // await index.open()

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

    try {
      const value = await index.get(key)
      if (value) {
        return value
      }
    } catch (e) {
      // LEVEL_NOT_FOUND (ie. key not found)
    }

    return keyValueStore.get(key)
  }

  const iterator = async function * () {
    await queue.onIdle()
    for await (const [key, value] of index.iterator()) {
      yield { key, value }
    }
  }

  const task = async () => {
    await queue.add(updateIndex(index))
  }
  // TODO: all()

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
    // TODO: all,
    close,
    drop
  }
}

export default KeyValuePersisted
