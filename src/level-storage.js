import { Level } from 'level'

const LevelStorage = async ({ path, valueEncoding } = {}) => {
  path = path || './level'

  // console.log("Path:", path)

  const db = new Level(path, { valueEncoding: valueEncoding || 'view', passive: true })
  await db.open()

  const put = async (key = null, value) => {
    return add(null, value)
  }

  const add = async (hash, value) => {
    await db.put(hash, value, { valueEncoding })
  }

  const del = async (hash) => {
    await db.del(hash)
  }

  const get = async (hash) => {
    const value = await db.get(hash, { valueEncoding })
    if (value !== undefined) {
      return value
    }
  }

  // TODO: rename to iterator()
  // const values = async () => {
  //   const res = {}
  //   for await (const [key, value] of await db.iterator({ valueEncoding }).all()) {
  //     res[key] = value
  //   }
  //   return res
  // }

  // TODO: all()

  const merge = async (other) => {}

  const clear = async () => {
    await db.clear()
  }

  const close = async () => {
    await db.close()
  }

  return {
    add,
    put,
    del,
    get,
    // TODO: iterator,
    // TODO: all,
    merge,
    clear,
    close
  }
}

export default LevelStorage
