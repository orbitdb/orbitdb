'use strict';

const Lazy    = require('lazy.js');
const OrbitDB = require('./OrbitDB');
const OpTypes = require('./Operation').Types;
const Counter = require('./GCounter');

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
    console.log("UPDATE IDNEX!", JSON.stringify(oplog.ops, null, 2));
    const counter = this._index[oplog.dbname];
    if(counter) {
      Lazy(oplog.ops)
        .map((f) => Counter.from(f.value))
        .each((f) => counter.merge(f))

      this._index[oplog.dbname] = counter;
    }
  }
}

class CounterDB extends OrbitDB {
  constructor(ipfs, options) {
    super(ipfs, options)
    // this._counters = {};
    this._index = new CounterIndex();
  }

  use(dbname, id) {
    // this._counters[dbname] = new Counter(id);
    this._index.createCounter(dbname, id);
    return super.use(dbname, id);
  }

  // sync(dbname, hash) {
    // const counter = this._counters[dbname];
    // if(counter) {
    //   return super.sync(dbname, hash).then((oplog) => {
    //     console.log("OPFS", oplog)
    //     return Lazy(oplog.ops)
    //       .map((f) => Counter.from(f.value))
    //       .map((f) => counter.merge(f))
    //       .toArray();
    //   });
    // }
  // }

  query(dbname) {
    // return this._counters[dbname].value;
    return this._index.get(dbname).value;
  }

  inc(dbname, amount) {
    const counter = this._index.get(dbname);
    if(counter) {
      counter.increment(amount);
      return this._addOperation(dbname, OpTypes.Inc, null, counter.payload);
    }
  }
}

module.exports = CounterDB;
