import { Level } from 'level'

const valueEncoding = 'json'

const KeyValuePersisted = async ({ KeyValue, OpLog, Database, ipfs, identity, databaseId, accessController, storage }) => {
  const keyValueStore = await KeyValue({ OpLog, Database, ipfs, identity, databaseId, accessController, storage })
  const { events, log } = keyValueStore

  const path = `./${identity.id}/${databaseId}_index`
  const index = new Level(path, { valueEncoding })
  await index.open()

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
    for await (const [key, value] of index.iterator()) {
      yield { key, value }
    }
  }

  const close = async () => {
    events.off('update', updateIndex(index))
    await index.close()
    await keyValueStore.close()
  }

  const drop = async () => {
    events.off('update', updateIndex(index))
    await index.clear()
    await keyValueStore.clear()
  }

  // Listen for update events from the database and update the index on every update
  events.on('update', updateIndex(index))

  return {
    ...keyValueStore,
    get,
    iterator,
    close,
    drop
  }
}

export default KeyValuePersisted
