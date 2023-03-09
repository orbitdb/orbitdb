const KeyValue = async ({ OpLog, Database, ipfs, identity, address, name, accessController, directory, storage, meta }) => {
  const database = await Database({ OpLog, ipfs, identity, address, name, accessController, directory, storage, meta })

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

  const iterator = async function * ({ amount } = {}) {
    const keys = {}
    let count = 0
    for await (const entry of log.traverse()) {
      const { op, key, value } = entry.payload
      if (op === 'PUT' && !keys[key]) {
        keys[key] = true
        count++
        yield { key, value }
      } else if (op === 'DEL' && !keys[key]) {
        keys[key] = true
      }
      if (count >= amount) {
        break
      }
    }
  }

  return {
    ...database,
    type: 'keyvalue',
    put,
    set: put, // Alias for put()
    del,
    get,
    iterator
  }
}

export default KeyValue
