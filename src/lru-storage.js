import LRU from 'lru'

const defaultSize = 1000000

const LRUStorage = (next, { size } = {}) => {
  const values = new LRU(size || defaultSize)
  const add = async (hash, data) => {
    values.set(hash, data)
    if (next) {
      return next.add(data)
    }
  }
  const get = async (hash) => {
    if (values.peek(hash)) {
      return values.get(hash)
    }
    if (next) {
      return next.get(hash)
    }
  }
  const merge = async (other) => {
    if (other) {
      Object.keys(other.values()).forEach(k => {
        const value = other.get(k)
        values.set(k, value)
      })
    }
  }
  const values_ = () => (
    values.keys.reduce((res, key) => {
      res[key] = values.get(key)
      return res
    }, {})
  )
  return {
    add,
    get,
    merge,
    values: values_
  }
}

export default LRUStorage
