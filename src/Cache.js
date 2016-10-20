'use strict'

let filePath
let cache = {}

let store = typeof window !== 'undefined' && window.localStorage

if (!store) {
  const LocalStorage = require('node-localstorage').LocalStorage
  store = new LocalStorage('./scratch')
}

module.exports = {
  set (key, value) {
    cache[key] = value
    if (filePath) {
      // console.log("write cache:", filePath, JSON.stringify(cache, null, 2))
      store.setItem(filePath, JSON.stringify(cache, null, 2) + '\n')
    }
  },

  get (key) {
    return cache[key]
  },

  loadCache (cacheFile) {
    cache = {}
    // console.log("load cache:", cacheFile)
    if (cacheFile) {
      filePath = cacheFile
      cache = JSON.parse(store.getItem(cacheFile) || '{}')
    }
  },

  reset () {
    cache = {}
  }
}
