'use strict'

const pull = require('pull-stream')
const BlobStore = require('fs-pull-blob-store')
const Lock = require('lock')

let filePath
let store
let cache = {}
const lock = new Lock()

class Cache {
  static set(key, value) {
    return new Promise((resolve, reject) => {
      if (cache[key] === value)
        return resolve()

      cache[key] = value
      if(filePath && store) {
        lock(filePath, (release) => {
          // console.log("write cache:", filePath, JSON.stringify(cache, null, 2))
          pull(
            pull.values([cache]),
            pull.map((v) => JSON.stringify(v, null, 2)),
            store.write(filePath, release((err) => {
              if (err) {
                return reject(err)
              }
              resolve()
            }))
          )
        })
      } else {
        resolve()
      }
    })
  }

  static get(key) {
    return cache[key]
  }

  static loadCache(cachePath, cacheFile = 'orbit-db.cache') {
    cache = {}

    if (!cachePath)
      return Promise.resolve()

    // console.log("cache data:", cachePath)
    store = new BlobStore(cachePath)
    filePath = cacheFile

    return new Promise((resolve, reject) => {

      // console.log("load cache:", cacheFile)
      store.exists(cacheFile, (err, exists) => {
        if (err || !exists) {
          return resolve()
        }

        lock(cacheFile, (release) => {
          pull(
            store.read(cacheFile),
            pull.collect(release((err, res) => {
              if (err) {
                return reject(err)
              }

              cache = JSON.parse(Buffer.concat(res).toString() || '{}')

              resolve()
            }))
          )
        })
      })
    })
  }

  static reset() {
    cache = {}
    store = null
  }
}

module.exports = Cache
