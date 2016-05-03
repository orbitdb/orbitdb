'use strict';

const EventEmitter  = require('events').EventEmitter;
const OperationsLog = require('../oplog/OperationsLog');
const DefaultIndex  = require('./DefaultIndex');

class Store {
  constructor(ipfs, dbname, options) {
    this.dbname = dbname;
    this.events = new EventEmitter();
    this.options = options || {};
    this._index = new DefaultIndex();
    this._oplog = null;
    this._ipfs = ipfs;
  }

  use(id) {
    this.events.emit('load', this.dbname);
    this._oplog = new OperationsLog(this._ipfs, this.dbname, this.events, this.options);
    return this._oplog.load(id)
      .then((merged) => this._index.updateIndex(this._oplog, merged))
      .then(() => this.events.emit('readable', this.dbname))
      .then(() => this.events);
  }

  close() {
    this.events.emit('close', this.dbname);
  }

  sync(hash) {
    if(!hash || hash === this._oplog._lastWrite || !this._oplog)
      return Promise.resolve([]);

    let newItems;
    this.events.emit('load', this.dbname);
    return this._oplog.merge(hash)
      .then((merged) => newItems = merged)
      .then(() => this._index.updateIndex(this._oplog, newItems))
      .then(() => {
        if(newItems.length > 0)
          this.events.emit('readable', this.dbname);
      })
      .then(() => newItems)
  }

  delete() {
    if(this._oplog)
      this._oplog.delete();
  }

  _addOperation(type, key, data) {
    let result;
    if(this._oplog) {
      return this._oplog.addOperation(type, key, data)
        .then((op) => result = op)
        .then(() => this._index.updateIndex(this._oplog, [result.operation]))
        .then(() => this.events.emit('data', this.dbname, result.log))
        .then(() => result.operation.hash);
    }
  }
}

module.exports = Store;
