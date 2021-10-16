'use strict'

const multihashing = require('multihashing-async')
const mh = require('multihashes')

const defaultHashAlg = 'sha2-256'

// 'use strict'

// const ImmutableDB = require('./immutabledb-interface')

const createMultihash = (data, hashAlg) => {
  return new Promise((resolve, reject) => {
    multihashing(data, hashAlg || defaultHashAlg, (err, multihash) => {
      if (err) { return reject(err) }

      resolve(mh.toB58String(multihash))
    })
  })
}

// const LRU = require('lru')
// const ImmutableDB = require('./immutabledb-interface')
// const createMultihash = require('./create-multihash')

/* Memory store using an LRU cache */
class MemStore {
  constructor () {
    this._store = {}// new LRU(1000)
  }

  async put (value) {
    const data = value// new Buffer(JSON.stringify(value))
    const hash = await createMultihash(data)
    // console.log(this._store)
    // this._store.set(hash, data)
    if (!this._store) this._store = {}
    // console.log(this._store)
    // console.log(hash, data)
    this._store[hash] = data
    // return hash
    return {
      toJSON: () => {
        return {
          data: value,
          multihash: hash
        }
      }
    }
  }

  async get (key) {
    // if (data) {
    //   const value = JSON.parse(data)
    //   return value
    // }

    // return data
    return {
      toJSON: () => {
        return {
          data: this._store[key],
          multihash: key
        }
      }
    }
  }
}

module.exports = MemStore
