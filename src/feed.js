const Feed = async ({ OpLog, Database, ipfs, identity, databaseId, accessController, storage }) => {
  const database = await Database({ OpLog, ipfs, identity, databaseId, accessController, storage })

  const { addOperation, log } = database

  const put = async (key = null, value) => {
    return add(value)
  }

  const add = async (value) => {
    return addOperation({ op: 'ADD', key: null, value })
  }

  const del = async (hash) => {
    return addOperation({ op: 'DEL', key: hash, value: null })
  }

  const get = async (hash) => {
    const entry = await log.get(hash)
    return entry.payload.value
  }

  const iterator = async function * ({ gt, gte, lt, lte, amount } = {}) {
    const deleted = {}
    const it = log.iterator({ gt, gte, lt, lte, amount })
    for await (const entry of it) {
      const { hash, payload } = entry
      const { op, key, value } = payload
      if (op === 'ADD' && !deleted[hash]) {
        yield value
      } else if (op === 'DEL' && !deleted[key]) {
        deleted[key] = true
      }
    }
  }

  const all = async () => {
    const values = []
    for await (const entry of iterator()) {
      values.unshift(entry)
    }
    return values
  }

  return {
    ...database,
    type: 'feed',
    put,
    add,
    del,
    get,
    iterator,
    all
  }
}

export default Feed
