const KeyValueStore = async (Log, Database, ipfs, identity, databaseId, accessController) => {
  const database = await Database(Log, ipfs, identity, databaseId, accessController)

  const { sync, close, addOperation, log } = database

  const all = async function * () {
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

  const put = async (key, value) => {
    return addOperation({ op: 'PUT', key, value })
  }

  const del = async (key) => {
    return addOperation({ op: 'DEL', key, value: null })
  }

  return {
    put,
    set: put, // Alias for put()
    get,
    del,
    all,
    sync,
    close,
    database
  }
}

export default KeyValueStore
