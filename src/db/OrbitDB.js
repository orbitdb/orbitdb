'use strict';

const Lazy          = require('lazy.js');
const EventEmitter  = require('events').EventEmitter;
const Log           = require('ipfs-log');
const Cache         = require('../Cache');
const DBOperation   = require('./Operation');
const OperationsLog = require('./OperationsLog');

class OrbitDB {
  constructor(ipfs, options) {
    this._ipfs = ipfs;
    this.options = options || {};
    this.events = {};
    this._oplogs = {};
  }

  use(channel, user) {
    this.user = user;
    this.events[channel] = new EventEmitter();
    this._oplogs[channel] = new OperationsLog(this._ipfs, this.options);
    return this._oplogs[channel].create(user)
      .then(() => {
        if(this.options.cacheFile)
          return Cache.loadCache(this.options.cacheFile)
      })
      .then(() => {
        if(this.options.cacheFile)
          return this.sync(channel, Cache.get(channel))
      });
  }

  sync(channel, hash) {
    Cache.set(channel, hash);
  }

  query(channel) {
  }

  delete(channel) {
    if(this._oplogs[channel])
      this._oplogs[channel].delete();
  }

  _write(channel, password, operation, key, value) {
    const oplog = this._oplogs[channel];
    const log = oplog._log;
    return DBOperation.create(this._ipfs, log, this.user, operation, key, value)
      .then((result) => {
          oplog._cachePayload(result.node.payload, result.op);
          return result;
      }).then((result) => {
        return Log.getIpfsHash(this._ipfs, log)
          .then((listHash) => {
            oplog.lastWrite = listHash;
            Cache.set(channel, listHash);
            this.events[channel].emit('write', channel, listHash);
            return result;
          });
      }).then((result) => result.node.payload);
  }
}

module.exports = OrbitDB;
