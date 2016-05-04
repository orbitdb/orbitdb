'use strict';

class EventIndex {
  constructor() {
    this._index = {};
  }

  get() {
    return Object.keys(this._index).map((f) => this._index[f]);
  }

  updateIndex(oplog, updated) {
    let handled = [];

    updated.forEach((item) => {
      if(handled.indexOf(item.hash) === -1) {
        handled.push(item.hash);
        if(item.op === 'ADD') {
          this._index[item.hash] = item
        } else if(item.op === 'DEL') {
          delete this._index[item.value];
        }
      }
    });
  }
}

module.exports = EventIndex;
