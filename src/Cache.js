'use strict'

const pull = require('pull-stream')
const BlobStore = require('fs-pull-blob-store')

let filePath
let store
let cache = {}

class Cache {
  static set(key, value) {
    return new Promise((resolve, reject) => {
      cache[key] = value
      if(filePath && store) {
        // console.log("write cache:", filePath, JSON.stringify(cache, null, 2))
        pull(
          pull.values([cache]),
          pull.map((v) => JSON.stringify(v, null, 2)),
          store.write(filePath, (err) => {
            if (err) {
              return reject(err)
            }
            resolve()
          })
        )
      } else {
        resolve()
      }
    })
  }

  static get(key) {
    return cache[key]
  }

  static loadCache(cacheFile = 'orbit-db.cache') {
    cache = {}
    store = new BlobStore(cacheFile)
    return new Promise((resolve, reject) => {

      // console.log("load cache:", cacheFile)
      store.exists(cacheFile, (err, exists) => {
        if (err || !exists) {
          return resolve()
        }

        filePath = cacheFile
        pull(
          store.read(cacheFile),
          pull.collect((err, res) => {
            if (err) {
              return reject(err)
            }

            resolve(JSON.parse(res[0].toString() || '{}'))
          })
        )
      })
    })
  }

  static reset() {
    cache = {}
  }
}

module.exports = Cache
