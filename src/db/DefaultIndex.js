'use strict';

class DefaultIndex {
  constructor() {
    this._index = [];
  }

  get() {
    return this._index;
  }

  updateIndex(oplog) {
    this._index = oplog.ops;
  }
}

module.exports = DefaultIndex;
