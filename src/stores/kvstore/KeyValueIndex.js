'use strict';

const OpTypes = require('../../oplog/OpTypes');

class KeyValueIndex {
  constructor() {
    this._index = {};
  }

  get(key) {
    return this._index[key];
  }

  updateIndex(oplog) {
    let handled = [];
    const _createLWWSet = (item) => {
      if(handled.indexOf(item.key) === -1) {
        handled.push(item.key);
        if(OpTypes.isInsert(item.op))
          return item;
      }
      return null;
    };

    this._index = {};
    oplog.ops
      .reverse()
      .map(_createLWWSet)
      .filter((f) => f !== null)
      .forEach((f) => this._index[f.key] = f.value);
  }
}

module.exports = KeyValueIndex;
