const Events = async ({ OpLog, Database, ipfs, identity, address, name, access, directory, storage, meta, syncAutomatically }) => {
  const database = await Database({ OpLog, ipfs, identity, address, name, access, directory, storage, meta, syncAutomatically })

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
      const hash = event.hash
      const value = event.payload.value
      yield { hash, value }
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
    type: 'eventstore',
    put,
    add,
    get,
    iterator,
    all
  }
}

export default Events
