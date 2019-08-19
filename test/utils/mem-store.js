'use strict'

const multihashing = require('multihashing-async')
const CID = require('cids')

const cidifyString = (str) => {
  if (!str) {
    return str
  }

  if (Array.isArray(str)) {
    return str.map(cidifyString)
  }

  return new CID(str)
}

/* Memory store using an LRU cache */
class MemStore {
  constructor () {
    this._store = new Map()
  }

  async put (value) {
    const buffer = Buffer.from(JSON.stringify(value))
    const multihash = await multihashing(buffer, 'sha2-256')
    const cid = new CID(1, 'dag-cbor', multihash)
    const key = cid.toBaseEncodedString('base58btc')
    this._store.set(key, value)

    return cid
  }

  async get (cid) {
    if (CID.isCID(cid)) {
      cid = cid.toBaseEncodedString('base58btc')
    }
    const data = this._store.get(cid)
    const links = ['next', 'heads']
    links.forEach((prop) => {
      if(data[prop])
      data[prop] = cidifyString(data[prop])
    })

    return {
      value: data
    }
  }
}

module.exports = MemStore
