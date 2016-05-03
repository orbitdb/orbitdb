'use strict';

const Store   = require('../Store');
const KVIndex = require('./KeyValueIndex');

class KeyValueStore extends Store {
  constructor(ipfs, dbname, options) {
    super(ipfs, dbname, options)
    this._index = new KVIndex();
  }

  delete() {
    super.delete();
    this._index = new KVIndex();
  }

  get(key) {
    return this._index.get(key);
  }

  set(key, data) {
    this.put(key, data);
  }

  put(key, data) {
    return this._addOperation('PUT', key, data);
  }

  del(key) {
    return this._addOperation('DELETE', key);
  }
}

module.exports = KeyValueStore;
