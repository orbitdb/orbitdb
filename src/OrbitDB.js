'use strict';

const Lazy         = require('lazy.js');
const EventEmitter = require('events').EventEmitter;
const Promise      = require('bluebird');
const async        = require('asyncawait/async');
const await        = require('asyncawait/await');
const logger       = require('orbit-common/lib/logger')("orbit-db.OrbitDB");
const Log          = require('ipfs-log');
const DBOperation  = require('./db/Operation');
const Post         = require('./post/Post');
const Cache        = require('./Cache');

class OrbitDB {
  constructor(ipfs, options) {
    this._ipfs = ipfs;
    this._logs = {};
    this.events = {};
    this.options = options || {};
    this.lastWrite = null;
    this._cached = [];
  }

  /* Public methods */
  use(channel, user) {
    this.user = user;
    return new Promise((resolve, reject) => {
      Log.create(this._ipfs, this.user.username).then((log) => {
        this._logs[channel] = log;
        this.events[channel] = new EventEmitter();
        if(this.options.cacheFile) {
          Cache.loadCache(this.options.cacheFile);
          this.sync(channel, Cache.get(channel));
        }
        resolve();
      }).catch(reject);
    });
  }

  sync(channel, hash) {
    console.log("--> Head:", hash)
    if(hash && hash !== this.lastWrite && this._logs[channel]) {
      this.events[channel].emit('load', 'sync', channel);
      const oldCount = this._logs[channel].items.length;
      Log.fromIpfsHash(this._ipfs, hash).then((other) => {
        this._logs[channel].join(other).then(() => {
          // Only emit the event if something was added
          const joinedCount = (this._logs[channel].items.length - oldCount);
          console.log("JOIN", joinedCount);
          if(joinedCount > 0) {
            this.events[channel].emit('sync', channel, hash);
            Cache.set(channel, hash);

            // Cache the payloads
            const payloadHashes = other.items.map((f) => f.payload);
            Promise.map(payloadHashes, (f) => {
              return OrbitDB.fetchPayload(this._ipfs, f);
            }, { concurrency: 1 }).then((r) => {
              r.forEach((f) => this._cached.push(f));
              this.events[channel].emit('loaded', 'sync', channel);
            }).catch((e) => {
              this.events[channel].emit('error', e.message);
            });

          } else {
            this.events[channel].emit('loaded', 'sync', channel);
          }
        });
      });
    } else {
      this.events[channel].emit('loaded', 'sync', channel);
    }
  }

  /* DB Operations */

  // Get items from the db
  query(channel, password, opts) {
    this.events[channel].emit('load', 'query', channel);
    // console.log("--> Query:", channel, opts);
    if(!opts) opts = {};

    if(!this._cached) this._cached = [];

    const operations = Lazy(this._logs[channel].items)
      // .map((f) => {
      //   let res = Lazy(this._cached).findWhere({ hash: f.payload });
      //   if(!res) {
      //     const payload = await(OrbitDB.fetchPayload(this._ipfs, f.payload));
      //     this._cached.push(payload);
      //     res = payload;
      //   }
      //   return res;
      // })

    const amount = opts.limit ? (opts.limit > -1 ? opts.limit : this._logs[channel].items.length) : 1; // Return 1 if no limit is provided

    let result = [];

    if(opts.key) {
      // Key-Value, search latest key first
      result = this._read(operations.reverse(), opts.key, 1, true).map((f) => f.value);
    } else if(opts.gt || opts.gte) {
      // Greater than case
      result = this._read(operations, opts.gt ? opts.gt : opts.gte, amount, opts.gte ? opts.gte : false)
    } else {
      // Lower than and lastN case, search latest first by reversing the sequence
      result = this._read(operations.reverse(), opts.lt ? opts.lt : opts.lte, amount, opts.lte || !opts.lt).reverse()
    }

    if(opts.reverse) result.reverse();
    const res = result.toArray();
    // console.log("--> Found", res.length, "items");
    this.events[channel].emit('loaded', 'query', channel);
    return res;
  }

  // Adds an event to the log
  add(channel, password, data) {
    return this._write(channel, password, DBOperation.Types.Add, null, data);
  }

  // Sets a key-value pair
  put(channel, password, key, data) {
    return this._write(channel, password, DBOperation.Types.Put, key, data);
  }

  // Deletes an event based on hash (of the operation) or 'key' of a key/val pair
  del(channel, password, key) {
    return this._write(channel, password, DBOperation.Types.Delete, key);
  }

  deleteChannel(channel, password) {
    if(this._logs[channel]) {
      this._logs[channel].clear();
      return true;
    }
    return false;
  }

  /* Private methods */

  // LWW-element-set
  _read(sequence, key, amount, inclusive) {
    // Last-Write-Wins, ie. use only the first occurance of the key
    let handled = [];
    const _createLWWSet = (item) => {
      if(Lazy(handled).indexOf(item.key) === -1) {
        handled.push(item.key);
        if(DBOperation.Types.isInsert(item.op))
          return item;
      }
      return null;
    };

    // Find the items from the sequence (list of operations)
    return sequence
      // .map((f) => await(OrbitDB.fetchPayload(this._ipfs, f.payload))) // IO - fetch the actual OP from ipfs. consider merging with LL.
      .skipWhile((f) => key && f.key !== key) // Drop elements until we have the first one requested
      .map(_createLWWSet) // Return items as LWW (ignore values after the first found)
      .compact() // Remove nulls
      .drop(inclusive ? 0 : 1) // Drop the 'gt/lt' item, include 'gte/lte' item
      .take(amount);
  }

  // Write an op to the db
  _write(channel, password, operation, key, value) {
    return new Promise((resolve, reject) => {
      DBOperation.create(this._ipfs, this._logs[channel], this.user, operation, key, value)
        .then((res) => {
          Log.getIpfsHash(this._ipfs, this._logs[channel]).then((listHash) => {
            this.lastWrite = listHash;
            Cache.set(channel, listHash);

            // Cache the payload
            let op = JSON.parse(JSON.stringify(res.op));
            Object.assign(op, { hash: res.node.payload });
            if(op.key === null) Object.assign(op, { key: res.node.payload });
            this._cached.push(op);

            this.events[channel].emit('write', channel, listHash);
            resolve(res.node.payload);
          })
        }).catch(reject);
    });
  }

  static fetchPayload(ipfs, hash) {
    return new Promise((resolve, reject) => {
      ipfs.object.get(hash)
        .then((payload) => {
          let data = JSON.parse(payload.Data);
          Object.assign(data, { hash: hash });
          if(data.key === null) Object.assign(data, { key: hash });
          resolve(data);
        })
        .catch(reject);
    });
  }
}

// TODO: move to where this is needed

module.exports = OrbitDB;
