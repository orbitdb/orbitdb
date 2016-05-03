'use strict';

const Store        = require('../Store');
const CounterIndex = require('./CounterIndex');

class CounterStore extends Store {
  constructor(ipfs, dbname, options) {
    super(ipfs, dbname, options)
    this._index = new CounterIndex();
  }

  use(id) {
    this._index.createCounter(id);
    return super.use(id);
  }

  delete() {
    super.delete();
    this._index = new CounterIndex();
  }

  value() {
    return this._index.get().value;
  }

  inc(amount) {
    const counter = this._index.get();
    if(counter) {
      counter.increment(amount);
      return this._addOperation('COUNTER', null, counter.payload);
    }
  }
}

module.exports = CounterStore;
