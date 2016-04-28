'use strict';

const EventEmitter  = require('events').EventEmitter;
const OperationsLog = require('../oplog/OperationsLog');
const DefaultIndex  = require('./DefaultIndex');

class Store {
  constructor(ipfs, options) {
    this._ipfs = ipfs;
    this._index = new DefaultIndex();
    this._oplogs = {};
    this.events = {};
    this.options = options || {};
  }

  use(dbname, id) {
    this.events[dbname] = new EventEmitter();
    const oplog = new OperationsLog(this._ipfs, dbname, this.events[dbname], this.options);
    return oplog.load(id)
      .then((merged) => this._index.updateIndex(oplog, merged))
      .then(() => this._oplogs[dbname] = oplog)
      .then(() => this.events[dbname]);
  }

  sync(dbname, hash) {
    const oplog = this._oplogs[dbname];
    let newItems;
    if(hash && oplog) {
      return oplog.merge(hash)
        .then((merged) => newItems = merged)
        .then(() => this._index.updateIndex(oplog, newItems))
        .then(() => this.events[dbname].emit('readable', dbname))
        .then(() => newItems)
    }

    return Promise.resolve([]);
  }

  delete(dbname) {
    if(this._oplogs[dbname])
      this._oplogs[dbname].delete();
  }

  _addOperation(dbname, type, key, data) {
    const oplog = this._oplogs[dbname];
    let result;
    if(oplog) {
      return oplog.addOperation(type, key, data)
        .then((op) => result = op)
        .then(() => this._index.updateIndex(oplog, [result]))
        .then(() => result.hash);
    }
  }
}

module.exports = Store;
