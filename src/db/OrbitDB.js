'use strict';

const Lazy          = require('lazy.js');
const EventEmitter  = require('events').EventEmitter;
const Log           = require('ipfs-log');
const OperationsLog = require('./OperationsLog');

class OrbitDB {
  constructor(ipfs, options) {
    this._ipfs = ipfs;
    this.options = options || {};
    this.events = {};
    this._oplogs = {};
  }

  use(dbname, user) {
    this.user = user;
    this.events[dbname] = new EventEmitter();
    this._oplogs[dbname] = new OperationsLog(this._ipfs, dbname);
    this.events[dbname].emit('load');
    return this._oplogs[dbname].create(user)
  }

  sync(dbname, hash) {
    // console.log("--> Head:", hash)
    const oplog = this._oplogs[dbname];
    if(oplog) {
      this.events[dbname].emit('load');
      return oplog.sync(hash)
        .then(() => this.events[dbname].emit('sync'))
        .then(() => oplog);
    }

    return Promise.resolve();
  }

  query(dbname) {
  }

  delete(dbname) {
    if(this._oplogs[dbname])
      this._oplogs[dbname].delete();
  }

  _write(dbname, password, operation, key, value) {
    const oplog = this._oplogs[dbname];
    const log = oplog._log;
    return DBOperation.create(this._ipfs, log, this.user, operation, key, value)
      .then((result) => {
        // console.log("res", result)
        return log.add(result.Hash);
      })
      .then((result) => {
        // console.log("res", result)
        oplog._cachePayload(result.node.payload, result.op);
        return result;
      }).then((result) => {
        return Log.getIpfsHash(this._ipfs, log)
          .then((listHash) => {
            oplog.lastWrite = listHash;
            Cache.set(dbname, listHash);
            this.events[dbname].emit('write', dbname, listHash);
            return result;
          });
      }).then((result) => result.node.payload);
  }
}

module.exports = OrbitDB;
