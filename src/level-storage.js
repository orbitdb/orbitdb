import { Level } from 'level'

const valueEncoding = 'buffer'

const LevelStorage = (next, { id } = {}) => {
  const path = id ? ('./' + id) : './level'
  const values = new Level(path)
  const add = async (hash, data) => {
    await values.put(hash, data, { valueEncoding })
    if (next) {
      return next.add(data)
    }
  }
  const get = async (hash) => {
    if (await values.get(hash) !== undefined) {
      const v = await values.get(hash, { valueEncoding })
      return v
    }
    if (next) {
      return next.get(hash)
    }
  }
  const merge = async (other) => {}
  const values_ = () => {}
  return {
    add,
    get,
    merge,
    values: values_
  }
}

export default LevelStorage
