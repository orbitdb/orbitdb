/**
 * @namespace Storage-LRU
 * @memberof module:Storage
 */
import LRU from 'lru'

const defaultSize = 1000000

const LRUStorage = async ({ size } = {}) => {
  let lru = new LRU(size || defaultSize)

  const put = async (hash, data) => {
    lru.set(hash, data)
  }

  const del = async (hash) => {
    lru.remove(hash)
  }

  const get = async (hash) => {
    return lru.get(hash)
  }

  const iterator = async function * () {
    for await (const key of lru.keys) {
      const value = lru.get(key)
      yield [key, value]
    }
  }

  const merge = async (other) => {
    if (other) {
      for await (const [key, value] of other.iterator()) {
        lru.set(key, value)
      }
    }
  }

  const clear = async () => {
    lru = new LRU(size || defaultSize)
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

export default LRUStorage
