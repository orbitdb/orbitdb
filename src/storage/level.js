/**
 * @namespace Storage-Level
 * @memberof module:Storage
 */
import { Level } from 'level'

const defaultValueEncoding = 'view'

const LevelStorage = async ({ path, valueEncoding } = {}) => {
  path = path || './level'
  valueEncoding = valueEncoding || defaultValueEncoding

  const db = new Level(path, { valueEncoding, passive: true })
  await db.open()

  const put = async (hash, value) => {
    await db.put(hash, value)
  }

  const del = async (hash) => {
    await db.del(hash)
  }

  const get = async (hash) => {
    try {
      const value = await db.get(hash)
      if (value) {
        return value
      }
    } catch (e) {
      // LEVEL_NOT_FOUND (ie. key not found)
    }
  }

  const iterator = async function * () {
    for await (const [key, value] of db.iterator()) {
      yield [key, value]
    }
  }

  const merge = async (other) => {}

  const clear = async () => {
    await db.clear()
  }

  const close = async () => {
    await db.close()
  }

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

export default LevelStorage
