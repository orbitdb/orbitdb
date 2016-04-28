'use strict';

class EventLogIndex {
  constructor() {
    this._index = {};
  }

  get() {
    return Object.keys(this._index).map((f) => this._index[f]);
  }

  updateIndex(oplog, updated) {
    let handled = [];

    updated.forEach((item) => {
      if(handled.indexOf(item.key) === -1) {
        handled.push(item.key);
        if(item.op === 'ADD') {
          this._index[item.key] = item
        } else if(item.op === 'DELETE') {
          delete this._index[item.key];
        }
      }
    });
  }
}

module.exports = EventLogIndex;
