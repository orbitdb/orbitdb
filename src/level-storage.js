import { Level } from 'level'

const LevelStorage = async ({ path, valueEncoding } = {}, next) => {
  path = path || './level'

  // console.log("Path:", path)

  const db = new Level(path, { valueEncoding: valueEncoding || 'view', passive: true })
  await db.open()

  const add = async (hash, data) => {
    await db.put(hash, data, { valueEncoding })
    if (next) {
      return next.add(data)
    }
  }

  const get = async (hash) => {
    const value = await db.get(hash, { valueEncoding })
    if (value !== undefined) {
      return value
    }
    if (next) {
      return next.get(hash)
    }
  }

  const del = async (hash) => {
    await db.del(hash)
    if (next) {
      return next.add(hash)
    }
  }

  // const values = async () => {
  //   const res = {}
  //   for await (const [key, value] of await db.iterator({ valueEncoding }).all()) {
  //     res[key] = value
  //   }
  //   return res
  // }

  const merge = async (other) => {}

  const clear = async () => {
    await db.clear()
  }

  const close = async () => {
    await db.close()
  }

  return {
    add,
    get,
    del,
    // values,
    merge,
    clear,
    close
  }
}

export default LevelStorage
