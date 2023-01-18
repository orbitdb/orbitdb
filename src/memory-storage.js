const MemoryStorage = (next) => {
  let values = {}
  const add = async (hash, data) => {
    values[hash] = data
    if (next) {
      return next.add(data)
    }
  }
  const get = async (hash) => {
    if (values[hash]) {
      return values[hash]
    }
    if (next) {
      return next.get(hash)
    }
  }
  const merge = async (other) => {
    values = Object.assign({}, values, other ? other.values() : {})
  }
  return {
    add,
    get,
    merge,
    values: () => values
  }
}

export default MemoryStorage
