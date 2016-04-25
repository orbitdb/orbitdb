'use strict';

const Lazy    = require('lazy.js');
const OrbitDB = require('./OrbitDB');
const OpTypes = require('./Operation').Types;
const GSet    = require('./GSet');

class KeyValueDB extends OrbitDB {
  constructor(ipfs, options) {
    super(ipfs, options)
    // this._set = null;
  }

  use(name, user) {
    // this._set = new GSet(user.username);
    return super.use(name, user);
  }

  sync(dbname, hash) {
    return super.sync(dbname, hash).then((oplog) => {
      return Lazy(oplog.ops)
        // .map((f) => GSet.from(f.value))
        // .map((f) => this._set.merge(f))
        .toArray();
    });
  }

  put(dbname, key, data) {
    // set.add(data);
    const oplog = this._oplogs[dbname];
    if(oplog) {
      return oplog.addOperation(dbname, OpTypes.Put, key, data).then((result) => {
        this.events[dbname].emit('write', dbname, result.hash);
        // console.log("OP", result);
        // this._set.add(result.op.hash, result.op.meta.ts);
        return result.op.hash;
      });
    }
    // return this._write(dbname, '', OpTypes.Put, key, data).then((op) => {
    //   console.log("OP", op);
    //   // this._set.add(op);
    // })
  }

  set(dbname, key, data) {
    this.put(dbname, key, data);
  }

  del(dbname, key) {
    const oplog = this._oplogs[dbname];
    if(oplog) {
      return oplog.addOperation(dbname, OpTypes.Delete, key).then((result) => {
        // console.log("OP", op);
        return result.op.hash;
      });
    }
  }

  get(dbname, key) {
    if(!key)
      return;

    const oplog = this._oplogs[dbname];
    // console.log("INIT", JSON.stringify(this._set.value, null, 2), oplog.ops)
    const items = oplog.ops.filter((f) => f.key === key)
    console.log("ITEM", items, key)
    let result = this._read(oplog.ops.reverse(), key, 1, true).toArray()[0];
      // result = this._read(operations.reverse(), opts.key, 1, true).map((f) => f.value);
    // let result = this._read(this._set.value, key).toArray()[0];
    // let result = this._read(this._set.value, key).toArray()[0];
    console.log("RSULT", result)
    // result = oplog.ops.find((e) => e.hash === result).value;
    return result ? result.value : null;
  }

  _read(ops, key) {
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
    return Lazy(ops)
      .skipWhile((f) => key && f.key !== key) // Drop elements until we have the first one requested
      .map(_createLWWSet) // Return items as LWW (ignore values after the first found)
      .compact() // Remove nulls
      .take(1);
    // return Lazy(ops)
    //   .skipWhile((f) => key && f !== key) // Drop elements until we have the first one requested
    //   .take(1);
  }
}

module.exports = KeyValueDB;
