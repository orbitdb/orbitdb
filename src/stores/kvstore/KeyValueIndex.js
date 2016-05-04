'use strict';

class KeyValueIndex {
  constructor() {
    this._index = {};
  }

  get(key) {
    return this._index[key];
  }

  updateIndex(oplog, updated) {
    updated.reverse().reduce((handled, item) => {
      if(handled.indexOf(item.key) === -1) {
        handled.push(item.key);
        if(item.op === 'PUT') {
          this._index[item.key] = item.value
        } else if(item.op === 'DEL') {
          delete this._index[item.key];
        }
      }
      return handled;
    }, []);
  }
}

module.exports = KeyValueIndex;
