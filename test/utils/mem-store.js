'use strict'

const multihashing = require('multihashing-async')
const CID = require('cids')
const pify = require('pify')

const createMultihash = pify(multihashing)

const transformCborLinksIntoCids = (data) => {
  if (!data) {
    return data
  }

  if (data['/']) {
    return new CID(data['/'])
  }

  if (Array.isArray(data)) {
    return data.map(transformCborLinksIntoCids)
  }

  if (typeof data === 'object') {
    return Object.keys(data).reduce((obj, key) => {
      obj[key] = transformCborLinksIntoCids(data[key])

      return obj
    }, {})
  }

  return data
}

/* Memory store using an LRU cache */
class MemStore {
  constructor () {
    this._store = new Map()
  }

  async put (value) {
    const buffer = Buffer.from(JSON.stringify(value))
    const multihash = await createMultihash(buffer, 'sha2-256')
    const cid = new CID(1, 'dag-cbor', multihash)
    const key = cid.toBaseEncodedString()

    this._store.set(key, value)

    return cid
  }

  async get (cid) {
    if (CID.isCID(cid)) {
      cid = cid.toBaseEncodedString()
    }

    const data = this._store.get(cid)

    return {
      value: transformCborLinksIntoCids(data)
    }
  }
}

module.exports = MemStore
