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
    return oplog.create(id)
      .then(() => this._oplogs[dbname] = oplog)
      .then(() => this._index.updateIndex(oplog))
      .then(() => this.events[dbname]);
  }

  sync(dbname, hash) {
    const oplog = this._oplogs[dbname];
    if(hash && oplog) {
      return oplog.merge(hash)
        .then(() => this._index.updateIndex(oplog))
        .then(() => this);
    }

    return Promise.resolve(this);
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
        .then(() => this._index.updateIndex(oplog))
        .then(() => result);
    }
  }
}

module.exports = Store;
