'use strict';

const EventEmitter  = require('events').EventEmitter;
const OperationsLog = require('../oplog/OperationsLog');
const DefaultIndex  = require('./DefaultIndex');

class Store {
  constructor(ipfs, dbname, options) {
    this.dbname = dbname;
    this.events = null;
    this.options = options || {};
    this._index = new DefaultIndex();
    this._oplog = null;
    this._ipfs = ipfs;
  }

  use(id) {
    this.events = new EventEmitter();
    const oplog = new OperationsLog(this._ipfs, this.dbname, this.events, this.options);
    return oplog.load(id)
      .then((merged) => this._index.updateIndex(oplog, merged))
      .then(() => this._oplog = oplog)
      .then(() => this.events);
  }

  close() {
    this.events.emit('close', this.dbname);
  }

  sync(hash) {
    const oplog = this._oplog;
    let newItems;
    if(hash && oplog) {
      return oplog.merge(hash)
        .then((merged) => newItems = merged)
        .then(() => this._index.updateIndex(oplog, newItems))
        .then(() => this.events.emit('readable', this.dbname))
        .then(() => newItems)
    }

    return Promise.resolve([]);
  }

  delete() {
    if(this._oplog)
      this._oplog.delete();
  }

  _addOperation(type, key, data) {
    const oplog = this._oplog;
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
