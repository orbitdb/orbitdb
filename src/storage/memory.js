/**
 * @namespace Storage-Memory
 * @memberof module:Storage
 * @description
 * MemoryStorage stores data in memory.
 */

/**
  * Creates an instance of MemoryStorage.
  * @function
  * @return {module:Storage.Storage-Memory} An instance of MemoryStorage.
  * @memberof module:Storage
  * @instance
  */
const MemoryStorage = async () => {
  let memory = {}

  /**
   * Puts data to memory.
   * @function
   * @param {string} hash The hash of the data to put.
   * @param {*} data The data to store.
   * @memberof module:Storage.Storage-Memory
   * @instance
   */
  const put = async (hash, data) => {
    memory[hash] = data
  }

  /**
   * Deletes data from memory.
   * @function
   * @param {string} hash The hash of the data to delete.
   * @memberof module:Storage.Storage-Memory
   * @instance
   */
  const del = async (hash) => {
    delete memory[hash]
  }

  /**
   * Gets data from memory.
   * @function
   * @param {string} hash The hash of the data to get.
   * @memberof module:Storage.Storage-Memory
   * @instance
   */
  const get = async (hash) => {
    return memory[hash]
  }

  /**
   * Iterates over records stored in memory.
   * @function
   * @yields [string, string] The next key/value pair from memory.
   * @memberof module:Storage.Storage-Memory
   * @instance
   */
  const iterator = async function * () {
    for await (const [key, value] of Object.entries(memory)) {
      yield [key, value]
    }
  }

  /**
   * Merges data from another source into memory.
   * @function
   * @param {module:Storage} other Another storage instance.
   * @memberof module:Storage.Storage-Memory
   * @instance
   */
  const merge = async (other) => {
    if (other) {
      for await (const [key, value] of other.iterator()) {
        put(key, value)
      }
    }
  }

  /**
  * Clears the contents of memory.
  * @function
  * @memberof module:Storage.Storage-Memory
  * @instance
  */
  const clear = async () => {
    memory = {}
  }

  const close = async () => {}

  return {
    put,
    del,
    get,
    iterator,
    merge,
    clear,
    close
  }
}

export default MemoryStorage
