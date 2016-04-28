'use strict';

const Store   = require('../Store');
const KVIndex = require('./KeyValueIndex');

class KeyValueStore extends Store {
  constructor(ipfs, options) {
    super(ipfs, options)
    this._index = new KVIndex();
  }

  delete(dbname) {
    super.delete(dbname);
    this._index = new KVIndex();
  }

  get(dbname, key) {
    return this._index.get(key);
  }

  set(dbname, key, data) {
    this.put(dbname, key, data);
  }

  put(dbname, key, data) {
    return this._addOperation(dbname, 'PUT', key, data);
  }

  del(dbname, key) {
    return this._addOperation(dbname, 'DELETE', key);
  }
}

module.exports = KeyValueStore;
