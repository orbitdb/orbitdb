'use strict';

class EventIndex {
  constructor() {
    this._index = {};
  }

  get() {
    return Object.keys(this._index).map((f) => this._index[f]);
  }

  updateIndex(oplog, added) {
    added.reduce((handled, item) => {
      if(handled.indexOf(item.hash) === -1) {
        handled.push(item.hash);
        if(item.payload.op === 'ADD') {
          this._index[item.hash] = item.payload
        } else if(item.payload.op === 'DEL') {
          delete this._index[item.payload.value];
        }
      }
      return handled;
    }, []);
  }
}

module.exports = EventIndex;
