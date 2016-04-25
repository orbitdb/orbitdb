'use strict';

const Lazy        = require('lazy.js');
const Log         = require('ipfs-log');
const Cache       = require('../Cache');
const DBOperation = require('./Operation');

/*
  Load, cache and index operations log
*/

class OperationsLog {
  constructor(ipfs, dbname, opts) {
    this.dbname = dbname;
    this.options = opts || { cacheFile: null };
    this.id = null;
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
    return Log.create(this._ipfs, this.id)
      .then((log) => this._log = log)
      .then(() => {
        if(this.options.cacheFile)
          return Cache.loadCache(this.options.cacheFile)

        return;
      })
      .then(() => {
        if(this.options.cacheFile)
          return this.sync(Cache.get(this.dbname))

        return;
      });
  }

  delete() {
    this._log.clear();
  }

  sync(hash) {
    // console.log("--> Head2:", hash, this.lastWrite)
    if(!hash || hash === this.lastWrite || !this._log)
      return Promise.resolve();

    const oldCount = this._log.items.length;

    return Log.fromIpfsHash(this._ipfs, hash)
      .then((other) => this._log.join(other))
      .then((merged) => {
        if(this._log.items.length - oldCount === 0)
          return;

        return this._cacheInMemory(this._log);
      })
      .then(() => Cache.set(this.id, hash));
  }

  addOperation(dbname, operation, key, value) {
    let post;
    return DBOperation.create(this._ipfs, this._log, this.user, operation, key, value)
      // .then((op) => {
      //   post = op.Post;
      //   return log.add(op.Hash);
      // })
      // .then((node) => resolve({ node: node, op: post }))
      .then((result) => {
        // console.log("res1", result)
        return this._log.add(result.Hash).then((node) => {
          return { node: node, op: result.Post };
        });
      })
      .then((result) => {
        // console.log("res2", result)
        this._cachePayload(result.node.payload, result.op);
        return result;
      }).then((result) => {
        return Log.getIpfsHash(this._ipfs, this._log)
          .then((listHash) => {
            this.lastWrite = listHash;
            Cache.set(this.dbname, listHash);
            // this.events[dbname].emit('write', this.dbname, listHash);
            return { hash: listHash, op: result.op };
          });
      }).then((result) => {
        return result;
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
