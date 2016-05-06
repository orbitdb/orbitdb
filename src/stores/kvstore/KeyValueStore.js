'use strict';

const Store         = require('../Store');
const KeyValueIndex = require('./KeyValueIndex');

class KeyValueStore extends Store {
  constructor(ipfs, id, dbname, options) {
    Object.assign(options || {}, { Index: KeyValueIndex });
    super(ipfs, id, dbname, options)
  }

  get(key) {
    return this._index.get(key);
  }

  set(key, data) {
    this.put(key, data);
  }

  put(key, data) {
    const operation = {
      op: 'PUT',
      key: key,
      value: data,
      meta: {
        ts: new Date().getTime()
      }
    };
    return this._addOperation(operation);
  }

  del(key) {
    const operation = {
      op: 'DEL',
      key: key,
      value: null,
      meta: {
        ts: new Date().getTime()
      }
    };
    return this._addOperation(operation);
  }
}

module.exports = KeyValueStore;
