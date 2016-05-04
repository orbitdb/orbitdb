'use strict';

class KeyValueIndex {
  constructor() {
    this._index = {};
  }

  get(key) {
    return this._index[key];
  }

  updateIndex(oplog, updated) {
    let handled = [];

    updated.reverse().forEach((item) => {
      if(handled.indexOf(item.key) === -1) {
        handled.push(item.key);
        if(item.op === 'PUT') {
          this._index[item.key] = item.value
        } else if (item.op === 'DEL') {
          delete this._index[item.key];
        }
      }
    });
  }
}

module.exports = KeyValueIndex;
