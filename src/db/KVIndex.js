'use strict';

const Lazy    = require('lazy.js');
const OpTypes = require('./Operation').Types;

class KVIndex {
  constructor() {
    this._index = {};
  }

  get(key) {
    return this._index[key];
  }

  updateIndex(oplog) {
    let handled = [];
    const _createLWWSet = (item) => {
      if(Lazy(handled).indexOf(item.key) === -1) {
        handled.push(item.key);
        if(OpTypes.isInsert(item.op))
          return item;
      }
      return null;
    };

    this._index = {};
    Lazy(oplog.ops.reverse())
      .map(_createLWWSet)
      .compact()
      // .take(oplog.ops.length)
      .each((f) => this._index[f.key] = f.value);
  }
}

module.exports = KVIndex;
