'use strict';

const Log   = require('ipfs-log');
const Cache = require('../Cache');

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
    return this._log.items.map((f) => {
      Object.assign(f.payload, { hash: f.hash });
      if(f.payload.key === null) Object.assign(f.payload, { key: f.hash });
      return f.payload;
    });
  }

  create(id) {
    this.events.emit('load', this.dbname);
    return Log.create(this._ipfs, id)
      .then((log) => this._log = log)
      .then(() => Cache.loadCache(this.options.cacheFile))
      .then(() => this.merge(Cache.get(this.dbname)))
      .then(() => this);
  }

  addOperation(operation, key, value) {
    const entry = {
      op: operation,
      key: key,
      value: value,
      meta: {
        size: Buffer.byteLength(value ? JSON.stringify(value) : '', 'utf8'),
        ts: new Date().getTime()
      }
    };

    return this._log.add(entry)
      .then((op) => {
        return Log.getIpfsHash(this._ipfs, this._log).then((hash) => {
          this._lastWrite = hash;
          Cache.set(this.dbname, hash);
          this.events.emit('data', this.dbname, hash);
          return op.hash;
        });
      });
  }

  merge(hash) {
    if(!hash || hash === this._lastWrite || !this._log)
      return Promise.resolve();

    this.events.emit('load', this.dbname);
    const oldCount = this._log.items.length;

    return Log.fromIpfsHash(this._ipfs, hash)
      .then((other) => this._log.join(other))
      .then(() => Cache.set(this.dbname, hash))
      .then(() => {
        if(this._log.items.length - oldCount === 0)
          this.events.emit('readable', this.dbname, hash)
      })
      .then(() => this)
  }

  delete() {
    this._log.clear();
  }
}

module.exports = OperationsLog;
