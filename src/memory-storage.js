const MemoryStorage = async () => {
  let memory = {}

  const put = async (hash, data) => {
    memory[hash] = data
  }

  const get = async (hash) => {
    if (memory[hash]) {
      return memory[hash]
    }
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

  const clear = async () => (memory = {})

  const close = async () => {}

  return {
    put,
    get,
    iterator,
    merge,
    clear,
    close
  }
}

export default MemoryStorage
