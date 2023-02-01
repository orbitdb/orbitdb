const EventStore = async ({ OpLog, Database, ipfs, identity, databaseId, accessController, storage }) => {
  const database = await Database({ OpLog, ipfs, identity, databaseId, accessController, storage })

  const { addOperation, log } = database

  const add = async (value) => {
    return addOperation({ op: 'ADD', key: null, value })
  }

  const get = async (hash) => {
    const entry = await log.get(hash)
    return entry.payload
  }

  const iterator = async function * ({ gt, gte, lt, lte, amount } = {}) {
    for await (const event of log.iterator({ gt, gte, lt, lte, amount })) {
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
    add,
    get,
    iterator,
    all
  }
}

export default EventStore
