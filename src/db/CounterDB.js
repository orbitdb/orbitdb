'use strict';

const Lazy    = require('lazy.js');
const OrbitDB = require('./OrbitDB');
const OpTypes = require('./Operation').Types;
const Counter = require('./GCounter');

class CounterDB extends OrbitDB {
  constructor(ipfs, options) {
    super(ipfs, options)
    this._counters = {};
  }

  use(dbname, user) {
    this._counters[dbname] = new Counter(user.username);
    return super.use(dbname, user);
  }

  sync(dbname, hash) {
    const counter = this._counters[dbname];
    if(counter) {
      return super.sync(dbname, hash).then((oplog) => {
        return Lazy(oplog.ops)
          .map((f) => Counter.from(f.value))
          .map((f) => counter.merge(f))
          .toArray();
      });
    }
  }

  query(dbname) {
    return this._counters[dbname].value;
  }

  inc(dbname, amount) {
    const counter = this._counters[dbname];
    if(counter) {
      counter.increment(amount);
      return this._write(dbname, '', OpTypes.Inc, null, counter.payload);
    }
  }
}

module.exports = CounterDB;
