'use strict';

const Lazy    = require('lazy.js');
const OpTypes = require('./Operation').Types;

class EventLogIndex {
  constructor() {
    this._index = [];
  }

  get() {
    return this._index;
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

    const items = Lazy(oplog.ops.reverse())
      .map(_createLWWSet) // Return items as LWW (ignore values after the first found)
      .compact() // Remove nulls
      // .take(oplog.ops.length)
      .toArray();

    this._index = items;
  }
}

module.exports = EventLogIndex;
