'use strict';

const Counter = require('../../crdts/GCounter');

class CounterIndex {
  constructor() {
    this._index = {};
  }

  createCounter(dbname, id) {
    this._index[dbname] = new Counter(id);
  }

  get(dbname) {
    return this._index[dbname];
  }

  updateIndex(oplog, updated) {
    const counter = this._index[oplog.dbname];
    if(counter) {
      updated.filter((f) => f && f.op === 'COUNTER')
        .map((f) => Counter.from(f.value))
        .forEach((f) => counter.merge(f))

      this._index[oplog.dbname] = counter;
    }
  }
}

module.exports = CounterIndex;
