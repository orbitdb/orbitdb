'use strict';

const Lazy         = require('lazy.js');
const EventEmitter = require('events').EventEmitter;
const async        = require('asyncawait/async');
const await        = require('asyncawait/await');
const OrbitList    = require('./list/OrbitList');
const Operation    = require('./db/Operation');
const OpTypes      = require('./db/OpTypes');
const Post         = require('./db/Post');

class OrbitDB {
  constructor(ipfs) {
    this._ipfs = ipfs;
    this._logs = {};
    this.events = new EventEmitter();
  }

  /* Public methods */
  use(channel, user, password) {
    this.user = user;
    this._logs[channel] = new OrbitList(this._ipfs, this.user.username);
  }

  sync(channel, hash) {
    // console.log("--> Head:", hash, this._logs[channel] !== undefined)
    if(hash && this._logs[channel]) {
      const other = await(OrbitList.fromIpfsHash(this._ipfs, hash));
      this._logs[channel].join(other);
      this.events.emit('sync', channel, hash);
    }
  }

  /* DB Operations */

  // Get items from the db
  query(channel, password, opts) {
    if(!opts) opts = {};

    const operations = Lazy(this._logs[channel].items);
    const amount = opts.limit ? (opts.limit > -1 ? opts.limit : this._logs[channel].items.length) : 1; // Return 1 if no limit is provided

    let result = [];

    if(opts.key) {
      // Key-Value, search latest key first
      result = this._read(operations.reverse(), opts.key, 1, true);
    } else if(opts.gt || opts.gte) {
      // Greater than case
      result = this._read(operations, opts.gt ? opts.gt : opts.gte, amount, opts.gte || opts.lte);
    } else {
      // Lower than and lastN case, search latest first by reversing the sequence
      result = this._read(operations.reverse(), opts.lt ? opts.lt : opts.lte, amount, opts.lte || !opts.lt).reverse();
    }

    if(opts.reverse) result.reverse();
    return result.toArray();
  }

  // Adds an event to the log
  add(channel, password, data) {
    const post = await(Post.publish(this._ipfs, data));
    const key = post.Hash;
    return await(this._write(channel, password, OpTypes.Add, key, post.Hash, data));
  }

  // Sets a key-value pair
  put(channel, password, key, data) {
    const post = await(Post.publish(this._ipfs, data));
    return await(this._write(channel, password, OpTypes.Put, key, post.Hash));
  }

  // Deletes an event based on hash (of the operation)
  del(channel, password, hash) {
    return await(this._write(channel, password, OpTypes.Delete, hash, null));
  }

  deleteChannel(channel, password) {
    this._logs[channel].clear();
    return true;
  }

  /* Private methods */

  // LWW-element-set
  _read(sequence, key, amount, inclusive) {
    // Last-Write-Wins, ie. use only the first occurance of the key
    let handled = [];
    const _createLWWSet = (item) => {
      const wasHandled = Lazy(handled).indexOf(item.key) > -1;
      if(!wasHandled) handled.push(item.key);
      if(OpTypes.isInsert(item.op) && !wasHandled) return item;
      return null;
    };

    // Find an items from the sequence (list of operations)
    return sequence
      .map((f) => await(f.fetchPayload())) // IO - fetch the actual OP from ipfs. consider merging with LL.
      .skipWhile((f) => key && f.key !== key) // Drop elements until we have the first one requested
      .drop(!inclusive ? 1 : 0) // Drop the 'gt/lt' item, include 'gte/lte' item
      .map(_createLWWSet) // Return items as LWW (ignore values after the first found)
      .filter((f) => f !== null) // Make sure we don't have empty ones
      .take(amount)
  }

  // Write an op to the db
  _write(channel, password, operation, key, value, data) {
    const hash = await(Operation.create(this._ipfs, this._logs[channel], this.user, operation, key, value));
    this.events.emit('write', channel, hash);
    return key;
  }
}

module.exports = OrbitDB;
