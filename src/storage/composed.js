/**
 * @namespace Storage-Composed
 * @memberof module:Storage
 */

// Compose storages:
// const storage1 = await ComposedStorage(await LRUStorage(), await LevelStorage())
// const storage2 = await ComposedStorage(storage1, await IPFSBlockStorage())

const ComposedStorage = async (storage1, storage2) => {
  const put = async (hash, data) => {
    await storage1.put(hash, data)
    await storage2.put(hash, data)
  }

  const get = async (hash) => {
    let value = await storage1.get(hash)
    if (!value) {
      value = await storage2.get(hash)
      if (value) {
        await storage1.put(hash, value)
      }
    }
    return value
  }

  const iterator = async function * () {
    const keys = []
    for (const storage of [storage1, storage2]) {
      for await (const [key, value] of storage.iterator()) {
        if (!keys[key]) {
          keys[key] = true
          yield [key, value]
        }
      }
    }
  }

  const merge = async (other) => {
    await storage1.merge(other)
    await storage2.merge(other)
    await other.merge(storage1)
    await other.merge(storage2)
  }

  const clear = async () => {
    await storage1.clear()
    await storage2.clear()
  }

  const close = async () => {
    await storage1.close()
    await storage2.close()
  }

  return {
    put,
    get,
    iterator,
    merge,
    clear,
    close
  }
}

export default ComposedStorage
