'use strict';

let items = {};

class MemoryCache {
  static put(hash, item) {
    items[hash] = item;
  }

  static get(hash) {
    return items[hash];
  }
}

module.exports = MemoryCache;
