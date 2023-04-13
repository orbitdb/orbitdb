/**
 * @namespace Storage-Memory
 * @memberof module:Storage
 */
const MemoryStorage = async () => {
  let memory = {}

  const put = async (hash, data) => {
    memory[hash] = data
  }

  const del = async (hash) => {
    delete memory[hash]
  }

  const get = async (hash) => {
    return memory[hash]
  }

  const iterator = async function * () {
    for await (const [key, value] of Object.entries(memory)) {
      yield [key, value]
    }
  }

  const merge = async (other) => {
    if (other) {
      for await (const [key, value] of other.iterator()) {
        put(key, value)
      }
    }
  }

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
