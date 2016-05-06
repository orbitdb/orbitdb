'use strict';

const Log   = require('ipfs-log');
const Cache = require('./Cache');

class OperationsLog extends Log {
  constructor(ipfs, id, name, opts) {
    super(ipfs, id, name, opts)
    // this.name = name;
    if(!opts) opts = {};
    if(!opts.cacheFile) Object.assign(opts, { cacheFile: null });
    this.options = opts;

    this._lastWrite = null;
    Cache.loadCache(this.options.cacheFile);
    // this._ipfs = ipfs;
    // this._log = null;
  }

  // get items() {
  //   return this._log.items;
  // }

  // add(operation, key, value) {
  add(entry) {
    // const entry = {
    //   op: operation,
    //   key: key,
    //   value: value,
    //   meta: {
    //     ts: new Date().getTime()
    //   }
    // };

    let node, logHash;
    return super.add(entry)
      .then((op) => node = op)
      .then(() => Object.assign(node.payload, { hash: node.hash }))
      .then(() => Log.getIpfsHash(this._ipfs, this))
      .then((hash) => logHash = hash)
      .then(() => this._lastWrite = logHash)
      .then(() => Cache.set(this.name, logHash))
      .then(() => {
        return node.payload;
      })
  }

  load() {
    // this._log = new Log(this._ipfs, this.id, this.dbname, options)
    // return Log.create(this._ipfs, id)
    //   .then((log) => this._log = log)
    //   .then(() => Cache.loadCache(this.options.cacheFile))
    //   .then(() => this.merge(Cache.get(this.name)))
    // Cache.loadCache(this.options.cacheFile);
    // console.log("THIS", this.name, Cache.get(this.name));
    const cached = Cache.get(this.name);
    if(cached) {
      return this.options.Log.fromIpfsHash(this._ipfs, cached)
        .then((log) => this.join(log));
    }

    return Promise.resolve([]);
  }

  join(other) {
    // if(!hash || hash === this._lastWrite)
    //   return Promise.resolve([]);

    const oldCount = this.items.length;
    let newItems = [];
    // return Log.fromIpfsHash(this._ipfs, hash)
      // .then((other) => super.join(other))
      // console.log("OTHER", other)
    return super.join(other)
      .then((merged) => newItems = merged)
      .then(() => Log.getIpfsHash(this._ipfs, this))
      .then((hash) => Cache.set(this.name, hash))
      .then(() => newItems.forEach((f) => Object.assign(f.payload, { hash: f.hash })))
      .then(() => newItems.map((f) => f.payload))
  }

}

module.exports = OperationsLog;
