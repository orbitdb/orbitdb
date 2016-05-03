'use strict';

const Counter = require('../../crdts/GCounter');

class CounterIndex {
  constructor() {
    this._index = null;
  }

  createCounter(id) {
    this._index = new Counter(id);
  }

  get() {
    return this._index;
  }

  updateIndex(oplog, updated) {
    const counter = this._index;
    if(counter) {
      updated.filter((f) => f && f.op === 'COUNTER')
        .map((f) => Counter.from(f.value))
        .forEach((f) => counter.merge(f))

      this._index = counter;
    }
  }
}

module.exports = CounterIndex;
