const EventStore = async ({ OpLog, Database, ipfs, identity, databaseId, accessController, storage }) => {
  const database = await Database({ OpLog, ipfs, identity, databaseId, accessController, storage })

  const { addOperation, log } = database

  const put = async (key = null, value) => {
    return add(value)
  }

  const add = async (value) => {
    return addOperation({ op: 'ADD', key: null, value })
  }

  const get = async (hash) => {
    const entry = await log.get(hash)
    return entry.payload.value
  }

  const iterator = async function * ({ gt, gte, lt, lte, amount } = {}) {
    const it = log.iterator({ gt, gte, lt, lte, amount })
    for await (const event of it) {
      yield event.payload.value
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
    type: 'events',
    put,
    add,
    get,
    iterator,
    all
  }
}

export default EventStore
