'use strict';

class KeyValueIndex {
  constructor() {
    this._index = {};
  }

  get(key) {
    return this._index[key];
  }

  updateIndex(oplog, added) {
    added.reverse().reduce((handled, item) => {
      if(handled.indexOf(item.payload.key) === -1) {
        handled.push(item.payload.key);
        if(item.payload.op === 'PUT') {
          this._index[item.payload.key] = item.payload.value
        } else if(item.payload.op === 'DEL') {
          delete this._index[item.payload.key];
        }
      }
      return handled;
    }, []);
  }
}

module.exports = KeyValueIndex;
