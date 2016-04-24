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

  use(channel, user) {
    this._counters[channel] = new Counter(user.username);
    return super.use(channel, user);
  }

  sync(channel, hash) {
    // console.log("--> Head:", hash, this.user.username)
    super.sync(channel, hash);
    const counter = this._counters[channel];
    const oplog = this._oplogs[channel];
    return oplog.sync(hash)
      .then(() => {
        return Lazy(oplog.ops)
          .map((f) => Counter.from(f.value))
          .map((f) => counter.merge(f))
          .toArray();
      });
  }

  query(channel) {
    return this._counters[channel].value;
  }

  inc(channel, amount) {
    const counter = this._counters[channel];
    if(counter) {
      counter.increment(amount);
      return this._write(channel, '', OpTypes.Inc, null, counter.payload);
    }
  }
}

module.exports = CounterDB;
