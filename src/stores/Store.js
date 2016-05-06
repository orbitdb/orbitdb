'use strict';

const EventEmitter  = require('events').EventEmitter;
const OperationsLog = require('../oplog/OperationsLog');
const DefaultIndex  = require('./DefaultIndex');

class Store {
  constructor(ipfs, id, dbname, options) {
    this.id = id;
    this.dbname = dbname;
    this.events = new EventEmitter();

    if(!options) options = {};
    if(!options.Index) Object.assign(options, { Index: DefaultIndex });
    if(!options.Log) Object.assign(options, { Log: OperationsLog });

    this.options = options;
    this._index = new this.options.Index(this.id);
    this._oplog = null;
    this._ipfs = ipfs;
  }

  use() {
    this.events.emit('load', this.dbname);
    this._oplog = new this.options.Log(this._ipfs, this.id, this.dbname, this.options);
    return this._oplog.load()
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
    return this.options.Log.fromIpfsHash(this._ipfs, hash)
      .then((log) => this._oplog.join(log))
      .then((merged) => newItems = merged)
      .then(() => this._index.updateIndex(this._oplog, newItems))
      .then(() => {
        if(newItems.length > 0)
          this.events.emit('readable', this.dbname);
      })
      .then(() => newItems)
  }

  delete() {
    this._index = new this.options.Index(this.id);
    if(this._oplog)
      this._oplog.clear();
  }

  // _addOperation(type, key, data) {
  _addOperation(data) {
    let result, logHash;
    if(this._oplog) {
      return this._oplog.add(data)
        .then((op) => result = op)
        .then(() => this.options.Log.getIpfsHash(this._ipfs, this._oplog))
        .then((hash) => logHash = hash)
        .then(() => this._index.updateIndex(this._oplog, [result]))
        .then(() => this.events.emit('data', this.dbname, logHash))
        .then(() => result.hash);
    }
  }
}

module.exports = Store;
