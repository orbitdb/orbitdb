import multihashing from 'multihashing-async'
import mh from 'multihashes'

const defaultHashAlg = 'sha2-256'

const createMultihash = (data, hashAlg) => {
  return new Promise((resolve, reject) => {
    multihashing(data, hashAlg || defaultHashAlg, (err, multihash) => {
      if (err) { return reject(err) }

      resolve(mh.toB58String(multihash))
    })
  })
}

export default class MemStore {
  constructor () {
    this._store = {}
  }

  async put (value) {
    const data = value
    const hash = await createMultihash(data)
    if (!this._store) this._store = {}
    this._store[hash] = data
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
