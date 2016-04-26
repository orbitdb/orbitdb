'use strict';

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
      if(handled.indexOf(item.key) === -1) {
        handled.push(item.key);
        if(OpTypes.isInsert(item.op))
          return item;
      }
      return null;
    };

    this._index = oplog.ops
      .reverse()
      .map(_createLWWSet)
      .filter((f) => f !== null);
  }
}

module.exports = EventLogIndex;
