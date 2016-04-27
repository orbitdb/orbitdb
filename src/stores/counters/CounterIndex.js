'use strict';

const Counter = require('../../crdts/GCounter');

class CounterIndex {
  constructor() {
    this._index = {};
  }

  createCounter(key, id) {
    this._index[key] = new Counter(id);
  }

  get(key) {
    return this._index[key];
  }

  updateIndex(oplog) {
    const counter = this._index[oplog.dbname];
    if(counter) {
      oplog.ops
        .filter((f) => f !== undefined)
        .map((f) => Counter.from(f.value))
        .forEach((f) => counter.merge(f))

      this._index[oplog.dbname] = counter;
    }
  }
}

module.exports = CounterIndex;
