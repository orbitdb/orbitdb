'use strict';

const Log          = require('ipfs-log')
const Store        = require('../Store');
const CounterIndex = require('./CounterIndex');

class CounterStore extends Store {
  constructor(ipfs, id, dbname, options) {
    Object.assign(options || {}, { Index: CounterIndex });
    super(ipfs, id, dbname, options)
  }

  value() {
    return this._index.get().value;
  }

  inc(amount) {
    const counter = this._index.get();
    if(counter) {
      counter.increment(amount);
      const operation = {
        op: 'COUNTER',
        key: null,
        value: counter.payload,
        meta: {
          ts: new Date().getTime()
        }
      };
      return this._addOperation(operation);
    }
  }
}

module.exports = CounterStore;
