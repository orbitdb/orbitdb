'use strict';

const Log   = require('ipfs-log');
const Cache = require('./Cache');

class OperationsLog {
  constructor(ipfs, dbname, events, opts) {
    this.dbname = dbname;
    this.events = events;
    this.options = opts || { cacheFile: null };
    this._lastWrite = null;
    this._ipfs = ipfs;
    this._log = null;
  }

  get ops() {
    return this._log.items;
  }

  addOperation(operation, key, value) {
    const entry = {
      op: operation,
      key: key,
      value: value
    };

    let node, logHash;
    return this._log.add(entry)
      .then((op) => node = op)
      .then(() => {
        Object.assign(node.payload, { hash: node.hash });
        if(node.payload.key === null)
          Object.assign(node.payload, { key: node.hash });
      })
      .then(() => Log.getIpfsHash(this._ipfs, this._log))
      .then((hash) => logHash = hash)
      .then(() => this._lastWrite = logHash)
      .then(() => Cache.set(this.dbname, logHash))
      .then(() => this.events.emit('data', this.dbname, logHash))
      .then(() => node.payload)
  }

  load(id) {
    this.events.emit('load', this.dbname);
    return Log.create(this._ipfs, id)
      .then((log) => this._log = log)
      .then(() => Cache.loadCache(this.options.cacheFile))
      .then(() => this.merge(Cache.get(this.dbname)))
  }

  merge(hash) {
    if(!hash || hash === this._lastWrite || !this._log)
      return Promise.resolve([]);

    this.events.emit('load', this.dbname);
    const oldCount = this._log.items.length;
    let newItems = [];
    return Log.fromIpfsHash(this._ipfs, hash)
      .then((other) => this._log.join(other))
      .then((merged) => newItems = merged)
      .then(() => Cache.set(this.dbname, hash))
      .then(() => newItems.map((f) => f.payload))
  }

  delete() {
    this._log.clear();
  }
}

module.exports = OperationsLog;
