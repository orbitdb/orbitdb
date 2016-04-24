'use strict';

const EventEmitter = require('events').EventEmitter;
const Lazy         = require('lazy.js');
const Log          = require('ipfs-log');

class OperationsLog {
  constructor(ipfs, options) {
    this.id = null;
    this.options = options;
    this.events = new EventEmitter();
    this.lastWrite = null;
    this._ipfs = ipfs;
    this._log = null;
    this._cached = {};
  }

  get ops() {
    return Lazy(this._log.items).map((f) => this._cached[f.payload]).toArray();
  }

  create(user) {
    this.id = user.username;
    return Log.create(this._ipfs, this.id).then((log) => this._log = log);
  }

  delete() {
    this._log.clear();
  }

  sync(hash) {
    // console.log("--> Head2:", hash, this.lastWrite)
    if(!hash || hash === this.lastWrite || !this._log)
      return Promise.resolve();

    this.events.emit('load');
    const oldCount = this._log.items.length;

    return Log.fromIpfsHash(this._ipfs, hash)
      .then((other) => this._log.join(other))
      .then((merged) => {
        if(this._log.items.length - oldCount === 0)
          return;

        return this._cacheInMemory(this._log);
      }).then(() => {
        this.events.emit('sync');
        this.events.emit('loaded');
        return;
      });
  }

  _cacheInMemory(log) {
    const promises = log.items
      .map((f) => f.payload)
      .filter((f) => !this._cached[f])
      .map((f) => {
        return this._ipfs.object.get(f)
          .then((obj) => this._cachePayload(f, JSON.parse(obj.Data)))
      });

    return Promise.all(promises);
  }

  _cachePayload(hash, payload) {
    if(!this._cached[hash]) {
      Object.assign(payload, { hash: hash });
      if(payload.key === null) Object.assign(payload, { key: hash });
      this._cached[hash] = payload;
    }
  }
}

module.exports = OperationsLog;
