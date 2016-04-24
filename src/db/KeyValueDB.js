'use strict';

const Lazy    = require('lazy.js');
const OrbitDB = require('./OrbitDB');
const OpTypes = require('./Operation').Types;
const Counter = require('./GCounter');

class KeyValueDB extends OrbitDB {
  constructor(ipfs, options) {
    super(ipfs, options)
    // this._counters = {};
  }

  use(name, user) {
    // this._counters[name] = new Counter(user.username);
    return super.use(name, user);
  }

  sync(name, hash) {
    // console.log("--> Head:", hash, this.user.username)
    super.sync(name, hash);
    // const counter = this._counters[name];
    const oplog = this._oplogs[name];
    return oplog.sync(hash)
      .then(() => {
        return Lazy(oplog.ops)
          // .map((f) => Counter.from(f.value))
          // .map((f) => counter.merge(f))
          .toArray();
      });
  }

  put(name, key, data) {
    return this._write(name, '', OpTypes.Put, key, data);
  }

  set(name, key, data) {
    this.put(name, key, data);
  }

  del(name, key) {
    return this._write(name, '', OpTypes.Delete, key);
  }

  query(name, opts) {
    this.events[name].emit('load', 'query', name);

    if(!opts) opts = {};
    let result = [];
    const oplog = this._oplogs[name];

    // Key-Value, search latest key first
    if(opts.key)
      result = this._read(oplog, opts.key).map((f) => f.value).toArray();

    this.events[name].emit('loaded', 'query', name);
    return result.length > 0 ? result[0] : null;
  }

  _read(oplog, key) {
    // Last-Write-Wins, ie. use only the first occurance of the key
    let handled = [];
    const _createLWWSet = (item) => {
      if(Lazy(handled).indexOf(item.key) === -1) {
        handled.push(item.key);
        if(OpTypes.isInsert(item.op))
          return item;
      }
      return null;
    };

    // Find the items from the sequence (list of operations)
    return Lazy(oplog.ops.reverse())
      .compact()
      .skipWhile((f) => key && f.key !== key) // Drop elements until we have the first one requested
      .map(_createLWWSet) // Return items as LWW (ignore values after the first found)
      .compact() // Remove nulls
      .take(1);
  }
}

module.exports = KeyValueDB;
