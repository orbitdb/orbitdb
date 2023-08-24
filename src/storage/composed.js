/**
 * @namespace Storage-Composed
 * @memberof module:Storage
 * @description
 * ComposedStorage stores data to multiple storage backends.
 * @example <caption>Store to LRU and Level</caption>
 * await ComposedStorage(await LRUStorage(), await LevelStorage())
 * @example <caption>Store to memory and IPFS</caption>
 * await ComposedStorage(await MemoryStorage(), await IPFSBlockStorage())
 * @example <caption>Store to LRU and a nested ComposedStorage</caption>
 * const storage1 = await ComposedStorage(await LRUStorage(), await LevelStorage())
 * await ComposedStorage(storage1, await IPFSBlockStorage())
 */

/**
  * Creates an instance of ComposedStorage.
  * @function
  * @param {module:Storage} storage1 A storage instance.
  * @param {module:Storage} storage2 A storage instance.
  * @return {module:Storage.Storage-Composed} An instance of ComposedStorage.
  * @memberof module:Storage
  * @instance
  */
const ComposedStorage = async (storage1, storage2) => {
  /**
   * Puts data to all configured storages.
   * @function
   * @param {string} hash The hash of the data to put.
   * @param {*} data The data to store.
   * @memberof module:Storage.Storage-Composed
   * @instance
   */
  const put = async (hash, data) => {
    await storage1.put(hash, data)
    await storage2.put(hash, data)
  }

  /**
   * Gets data from the composed storage.
   *
   * Get will fetch the data from storage1 first. If no value is found, an
   * attempt is made to fetch the data from storage2. If data exists in
   * storage2 but not in storage1, the data is added to storage1.
   * @function
   * @param {string} hash The hash of the data to get.
   * @memberof module:Storage.Storage-Composed
   * @instance
   */
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

  /**
   * Iterates over records stored in both storages.
   * @function
   * @yields [string, string] The next key/value pair from all storages.
   * @memberof module:Storage.Storage-Composed
   * @instance
   */
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

  /**
   * Merges data from another source into each of the composed storages.
   * @function
   * @param {module:Storage} other Another storage instance.
   * @memberof module:Storage.Storage-Composed
   * @instance
   */
  const merge = async (other) => {
    await storage1.merge(other)
    await storage2.merge(other)
    await other.merge(storage1)
    await other.merge(storage2)
  }

  /**
   * Calls clear on each of the composed storages.
   * @function
   * @memberof module:Storage.Storage-Composed
   * @instance
   */
  const clear = async () => {
    await storage1.clear()
    await storage2.clear()
  }

  /**
   * Calls close on each of the composed storages.
   * @function
   * @memberof module:Storage.Storage-Composed
   * @instance
   */
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
