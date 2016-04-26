'use strict';

const EventEmitter  = require('events').EventEmitter;
const OperationsLog = require('./OperationsLog');

class OrbitDB {
  constructor(ipfs, options) {
    this._ipfs = ipfs;
    this._index = null;
    this._oplogs = {};
    this.events = {};
    this.options = options || {};
  }

  use(dbname, id) {
    this.events[dbname] = new EventEmitter();
    const oplog = new OperationsLog(this._ipfs, dbname, this.events[dbname], this.options);
    return oplog.create(id)
      .then(() => {
        if(this._index)
          this._index.updateIndex(oplog);
        this._oplogs[dbname] = oplog;
        return this;
      });
  }

  sync(dbname, hash) {
    const oplog = this._oplogs[dbname];
    if(hash && oplog) {
      console.log("sync", dbname, hash, oplog.id)
      return oplog.sync(hash)
        .then((result) => {
          console.log("synced", dbname, hash, oplog.id)
          console.log("res", result)
          if(this._index)
            this._index.updateIndex(oplog);
          return this;
        });
    }

    return Promise.resolve(this);
  }

  delete(dbname) {
    if(this._oplogs[dbname])
      this._oplogs[dbname].delete();
  }

  _addOperation(dbname, type, key, data) {
    const oplog = this._oplogs[dbname];
    if(oplog) {
      return oplog.addOperation(type, key, data)
        .then((result) => {
          if(this._index)
            this._index.updateIndex(oplog);
          return result;
        });
    }
  }
}

module.exports = OrbitDB;
