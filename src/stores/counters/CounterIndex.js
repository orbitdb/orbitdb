'use strict';

const Counter = require('../../crdts/GCounter');

class CounterIndex {
  constructor() {
    this._counter = null;
  }

  createCounter(id) {
    this._counter = new Counter(id);
  }

  get() {
    return this._counter;
  }

  updateIndex(oplog, updated) {
    if(this._counter) {
      updated.filter((f) => f && f.op === 'COUNTER')
        .map((f) => Counter.from(f.value))
        .forEach((f) => this._counter.merge(f))
    }
  }
}

module.exports = CounterIndex;
