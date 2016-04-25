'use strict';

const Lazy    = require('lazy.js');
const OrbitDB = require('./OrbitDB');
const OpTypes = require('./Operation').Types;
const GSet    = require('./GSet');

class EventLogDB extends OrbitDB {
  constructor(ipfs, options) {
    super(ipfs, options)
    this._set = null;
    // this._counters = {};
  }

  use(name, user) {
    this._set = new GSet(user.username);
    return super.use(name, user);
  }

  sync(dbname, hash) {
    return super.sync(dbname, hash).then((oplog) => {
      return Lazy(oplog.ops)
        .map((f) => GSet.from(f.value))
        .map((f) => this._set.merge(f))
        .toArray();
    });
  }

  add(dbname, data) {
    const oplog = this._oplogs[dbname];
    if(oplog) {
      return oplog.addOperation(dbname, OpTypes.Add, null, data).then((result) => {
        this.events[dbname].emit('write', dbname, result.hash);
        this._set.add(result.op.hash);
        // console.log("OP", result)
        return result.op.hash;
      });
    }

    return;
  }

  remove(dbname, hash) {
    const oplog = this._oplogs[dbname];
    if(oplog) {
      return oplog.addOperation(dbname, OpTypes.Delete, hash).then((result) => {
        this.events[dbname].emit('write', dbname, result.hash);
        this._set.remove(hash);
        // console.log("OP", result)
        return result.op.hash;
      });
    }

    return;
  }

  iterator(dbname, options) {
    const messages = this.query(dbname, options);
    let currentIndex = 0;
    let iterator = {
      [Symbol.iterator]() {
        return this;
      },
      next() {
        let item = { value: null, done: true };
        if(currentIndex < messages.length) {
          item = { value: messages[currentIndex], done: false };
          currentIndex ++;
        }
        return item;
      },
      collect: () => messages
    }

    return iterator;
  }

  query(dbname, opts) {
    if(!opts) opts = {};

    const oplog = this._oplogs[dbname];
    const amount = opts.limit ? (opts.limit > -1 ? opts.limit : oplog.ops.length) : 1; // Return 1 if no limit is provided
    let result = [];

    if(opts.gt || opts.gte) {
      // Greater than case
      console.log("2")
      result = this._read(this._set.value, opts.gt ? opts.gt : opts.gte, amount, opts.gte ? opts.gte : false)
    } else {
      // Lower than and lastN case, search latest first by reversing the sequence
      result = this._read(this._set.value.reverse(), opts.lt ? opts.lt : opts.lte, amount, opts.lte || !opts.lt).reverse()
    }

    if(opts.reverse) result.reverse();
    let res = result.toArray();
      // const removed = this._itemsR.find((e) => e === item);
      res = oplog.ops.filter((f) => res.find((e) => e === f.hash))
    // console.log("RSULT", res)
    return res;
  }

  _read(ops, key, amount, inclusive) {
    // console.log("KET", key, amount, inclusive)
    return Lazy(ops)
      .skipWhile((f) => key && f !== key) // Drop elements until we have the first one requested
      .drop(inclusive ? 0 : 1) // Drop the 'gt/lt' item, include 'gte/lte' item
      .take(amount);
  }
}

module.exports = EventLogDB;
