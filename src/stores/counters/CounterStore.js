'use strict';

const Store        = require('../Store');
const CounterIndex = require('./CounterIndex');

class CounterStore extends Store {
  constructor(ipfs, options) {
    super(ipfs, options)
    this._index = new CounterIndex();
  }

  use(dbname, id) {
    this._index.createCounter(dbname, id);
    return super.use(dbname, id);
  }

  delete(dbname) {
    super.delete(dbname);
    this._index = new CounterIndex();
  }

  query(dbname) {
    return this._index.get(dbname).value;
  }

  inc(dbname, amount) {
    const counter = this._index.get(dbname);
    if(counter) {
      counter.increment(amount);
      return this._addOperation(dbname, 'COUNTER', null, counter.payload);
    }
  }
}

module.exports = CounterStore;
