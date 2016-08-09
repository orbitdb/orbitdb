'use strict'

const fs   = require('fs')
const path = require('path')

let filePath
let cache = {}

class Cache {
  static set(key, value) {
    return new Promise((resolve, reject) => {
      cache[key] = value
      if(filePath) {
        // console.log("write cache:", filePath, JSON.stringify(cache, null, 2))
        fs.writeFile(filePath, JSON.stringify(cache, null, 2) + "\n", resolve)
      } else {
        resolve()
      }
    })
  }

  static get(key) {
    return cache[key]
  }

  static loadCache(cacheFile) {
    cache = {}
    return new Promise((resolve, reject) => {
      // console.log("load cache:", cacheFile)
      if(cacheFile) {
        filePath = cacheFile
        fs.exists(cacheFile, (res) => {
          if(res) {
            fs.readFile(cacheFile, (err, res) => {
              cache = JSON.parse(res)
              // console.log("cache:", cache)
              resolve()
            })
          } else {
            // console.log("cache file doesn't exist")
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
  }

  static reset() {
    cache = {}
  }
}

module.exports = Cache
