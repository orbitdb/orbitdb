'use strict';

const Store   = require('./Store');
const KVIndex = require('./KeyValueIndex');
const OpTypes = require('./Operation').Types;

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
    return this._addOperation(dbname, OpTypes.Put, key, data);
  }

  del(dbname, key) {
    return this._addOperation(dbname, OpTypes.Delete, key);
  }
}

module.exports = KeyValueStore;
