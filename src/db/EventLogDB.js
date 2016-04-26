'use strict';

const Lazy          = require('lazy.js');
const OrbitDB       = require('./OrbitDB');
const OpTypes       = require('./Operation').Types;
const EventLogIndex = require('./EventLogIndex');

class EventLogDB extends OrbitDB {
  constructor(ipfs, options) {
    super(ipfs, options)
    this._index = new EventLogIndex();
  }

  delete(dbname) {
    super.delete(dbname);
    this._index = new EventLogIndex();
  }

  add(dbname, data) {
    return this._addOperation(dbname, OpTypes.Add, null, data);
  }

  remove(dbname, hash) {
    return this._addOperation(dbname, OpTypes.Delete, hash);
  }

  iterator(dbname, options) {
    const messages = this._query(dbname, options);
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

  _query(dbname, opts) {
    if(!opts) opts = {};

    const amount = opts.limit ? (opts.limit > -1 ? opts.limit : this._index.get().length) : 1; // Return 1 if no limit is provided
    let result = [];

    if(opts.gt || opts.gte) {
      // Greater than case
      result = this._read(this._index.get().reverse(), opts.gt ? opts.gt : opts.gte, amount, opts.gte ? opts.gte : false)
    } else {
      // Lower than and lastN case, search latest first by reversing the sequence
      result = this._read(this._index.get(), opts.lt ? opts.lt : opts.lte, amount, opts.lte || !opts.lt).reverse()
    }

    if(opts.reverse) result.reverse();

    return result.toArray();
  }

  _read(ops, key, amount, inclusive) {
    return Lazy(ops)
      .skipWhile((f) => key && f.key !== key) // Drop elements until we have the first one requested
      .drop(inclusive ? 0 : 1) // Drop the 'gt/lt' item, include 'gte/lte' item
      .take(amount);
  }
}

module.exports = EventLogDB;
