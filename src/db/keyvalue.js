const KeyValue = async ({ OpLog, Database, ipfs, identity, address, name, access, directory, storage, meta, syncAutomatically }) => {
  const database = await Database({ OpLog, ipfs, identity, address, name, access, directory, storage, meta, syncAutomatically })

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
        const hash = entry.hash
        yield { hash, key, value }
      } else if (op === 'DEL' && !keys[key]) {
        keys[key] = true
      }
      if (count >= amount) {
        break
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
    type: 'keyvalue',
    put,
    set: put, // Alias for put()
    del,
    get,
    iterator,
    all
  }
}

export default KeyValue
