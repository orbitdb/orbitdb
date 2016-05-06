'use strict';

const EventEmitter  = require('events').EventEmitter;
const Log   = require('ipfs-log');
// const OperationsLog = require('../oplog/OperationsLog');
const DefaultIndex  = require('./DefaultIndex');
const Cache = require('../oplog/Cache');

class Store {
  constructor(ipfs, id, dbname, options) {
    this.id = id;
    this.dbname = dbname;
    this.events = new EventEmitter();

    if(!options) options = {};
    if(!options.Index) Object.assign(options, { Index: DefaultIndex });
    if(!options.Log) Object.assign(options, { Log: Log });
    if(!options.cacheFile) Object.assign(options, { cacheFile: null });

    this.options = options;
    this._index = new this.options.Index(this.id);
    this._oplog = null;
    this._ipfs = ipfs;
    this._lastWrite = null;
  }

  use() {
    this.events.emit('load', this.dbname);
    this._oplog = new this.options.Log(this._ipfs, this.id, this.dbname, this.options);
    Cache.reset();
    return Cache.loadCache(this.options.cacheFile).then(() => {
      const cached = Cache.get(this.dbname);
        // return this._oplog.load()
      if(cached) {
        return this.options.Log.fromIpfsHash(this._ipfs, cached)
          .then((log) => this._oplog.join(log))
          .then((merged) => this._index.updateIndex(this._oplog, merged))
          .then(() => this.events.emit('readable', this.dbname))
          .then(() => this.events);
      }

      return Promise.resolve(this.events);
      // return this._oplog.load()
      //   .then((merged) => this._index.updateIndex(this._oplog, merged))
      //   .then(() => this.events.emit('readable', this.dbname))
      //   .then(() => this.events);
    });
  }

  close() {
    this.events.emit('close', this.dbname);
  }

  sync(hash) {
    // if(!hash || hash === this._oplog._lastWrite || !this._oplog)
    if(!hash || hash === this._lastWrite)
      return Promise.resolve([]);

    const oldCount = this._oplog.items.length;
    let newItems = [];
    // let newItems;
    this.events.emit('load', this.dbname);
    return this.options.Log.fromIpfsHash(this._ipfs, hash)
      .then((log) => this._oplog.join(log))
      .then((merged) => newItems = merged)
      .then(() => Log.getIpfsHash(this._ipfs, this._oplog))
      .then((hash) => Cache.set(this.dbname, hash))
      .then(() => this._index.updateIndex(this._oplog, newItems))
      .then(() => {
        if(newItems.length > 0)
          this.events.emit('readable', this.dbname);
      })
      .then(() => newItems)

      // .then(() => Log.getIpfsHash(this._ipfs, this))
      // .then((hash) => Cache.set(this.name, hash))
      // .then(() => newItems.forEach((f) => Object.assign(f.payload, { hash: f.hash })))
      // .then(() => newItems.map((f) => f.payload))
  }

  delete() {
    this._index = new this.options.Index(this.id);
    if(this._oplog)
      this._oplog.clear();
  }

  // _addOperation(type, key, data) {
  _addOperation(data) {
    // let node, logHash;
    // return super.add(entry)
    //   .then((op) => node = op)
    //   .then(() => Object.assign(node.payload, { hash: node.hash }))
    //   .then(() => Log.getIpfsHash(this._ipfs, this))
    //   .then((hash) => logHash = hash)
    //   .then(() => this._lastWrite = logHash)
    //   .then(() => Cache.set(this.name, logHash))
    //   .then(() => {
    //     return node.payload;
    //   })

    let result, logHash;
    if(this._oplog) {
      return this._oplog.add(data)
        // .then((op) => result = op)
        .then((res) => {
          result = res;
          Object.assign(result.payload, { hash: res.hash })
          return result;
        })
        // .then(() => Object.assign(result.payload, { hash: node.hash }))
        .then(() => this.options.Log.getIpfsHash(this._ipfs, this._oplog))
        .then((hash) => logHash = hash)
        .then(() => this._lastWrite = logHash)
        .then(() => Cache.set(this.dbname, logHash))
        .then(() => this._index.updateIndex(this._oplog, [result]))
        .then(() => this.events.emit('data', this.dbname, logHash))
        .then(() => result.hash);
    }
  }
}

module.exports = Store;
