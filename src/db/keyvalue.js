const KeyValue = async ({ OpLog, Database, ipfs, identity, databaseId, accessController, storage }) => {
  const database = await Database({ OpLog, ipfs, identity, databaseId, accessController, storage })

  const { addOperation, log } = database

  const put = async (key, value) => {
    return addOperation({ op: 'PUT', key, value })
  }

  const del = async (key) => {
    return addOperation({ op: 'DEL', key, value: null })
  }

  const get = async (key) => {
    for await (const entry of log.traverse()) {
      const { op, key: k, value } = entry.payload
      if (op === 'PUT' && k === key) {
        return value
      } else if (op === 'DEL' && k === key) {
        return
      }
    }
  }

  const iterator = async function * () {
    const keys = {}
    for await (const entry of log.traverse()) {
      const { op, key, value } = entry.payload
      if (op === 'PUT' && !keys[key]) {
        keys[key] = true
        yield { key, value }
      } else if (op === 'DEL' && !keys[key]) {
        keys[key] = true
      }
    }
  }

  // TODO: all()

  return {
    ...database,
    type: 'kv',
    put,
    set: put, // Alias for put()
    del,
    get,
    iterator
    // TODO: all,
  }
}

export default KeyValue
