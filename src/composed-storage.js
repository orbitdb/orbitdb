const ComposedStorage = async (...storages) => {
  const put = async (hash, data) => {
    for await (const storage of storages) {
      await storage.put(hash, data)
    }
  }

  const get = async (hash) => {
    for await (const storage of storages) {
      const value = await storage.get(hash)
      if (value) {
        return value
      }
    }
  }

  const iterator = async function * () {
    return storages[0].iterator()
  }

  const merge = async (other) => {
    for await (const storage1 of storages) {
      for await (const storage2 of storages) {
        await storage1.merge(storage2)
      }
    }
  }

  const clear = async () => {
    for await (const storage of storages) {
      await storage.clear()
    }
  }

  const close = async () => {
    for await (const storage of storages) {
      await storage.close()
    }
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
