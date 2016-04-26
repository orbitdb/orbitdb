'use strict';

const OrbitDB = require('./OrbitDB');
const OpTypes = require('./Operation').Types;
const KVIndex = require('./KVIndex');

class KeyValueDB extends OrbitDB {
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

module.exports = KeyValueDB;
