'use strict'

const path = require('path')

let filePath
let cache = {}

let store = typeof window !== 'undefined' && window.localStorage

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

  loadCache (cacheFile = 'orbit-cache') {
    cache = {}
    if (!store) {
      const LocalStorage = require('node-localstorage').LocalStorage
      const storePath = path.join(require('os').homedir(), cacheFile || 'stats')
      store = new LocalStorage(storePath)
    }

    filePath = cacheFile
    cache = JSON.parse(store.getItem(cacheFile) || '{}')
  },

  reset () {
    cache = {}
  }
}
