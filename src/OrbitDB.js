'use strict';

const Lazy         = require('lazy.js');
const EventEmitter = require('events').EventEmitter;
const async        = require('asyncawait/async');
const await        = require('asyncawait/await');
const OrbitList    = require('./list/OrbitList');
const Operation    = require('./db/Operation');
const OpTypes      = require('./db/OpTypes'); // TODO: move to Operation.Types
const Post         = require('./post/Post');

class OrbitDB {
  constructor(ipfs) {
    this._ipfs = ipfs;
    this._logs = {};
    this.events = {};
  }

  /* Public methods */
  use(channel, user, password) {
    this.user = user;
    this._logs[channel] = new OrbitList(this._ipfs, this.user.username);
    this.events[channel] = new EventEmitter();
  }

  sync(channel, hash) {
    // console.log("--> Head:", hash)
    if(hash && this._logs[channel]) {
      const oldCount = this._logs[channel].items.length;
      const other = await(OrbitList.fromIpfsHash(this._ipfs, hash));
      await(this._logs[channel].join(other));

      // Only emit the event if something was added
      const joinedCount = (this._logs[channel].items.length - oldCount);
      if(joinedCount > 0)
        this.events[channel].emit('sync', channel, 'empty');
    }
  }

  /* DB Operations */

  // Get items from the db
  query(channel, password, opts) {
    console.log("--> Query:", channel, opts);

    if(!opts) opts = {};

    const operations = Lazy(this._logs[channel].items);
    const amount = opts.limit ? (opts.limit > -1 ? opts.limit : this._logs[channel].items.length) : 1; // Return 1 if no limit is provided

    let result = [];

    if(opts.key) {
      // Key-Value, search latest key first
      result = this._read(operations.reverse(), opts.key, 1, true).map((f) => f.value);
    } else if(opts.gt || opts.gte) {
      // Greater than case
      result = this._read(operations, opts.gt ? opts.gt : opts.gte, amount, opts.gte ? opts.gte : false);
    } else {
      // Lower than and lastN case, search latest first by reversing the sequence
      result = this._read(operations.reverse(), opts.lt ? opts.lt : opts.lte, amount, opts.lte || !opts.lt).reverse();
    }

    if(opts.reverse) result.reverse();
    const res = result.toArray();
    console.log("--> Found", res.length, "items");
    return res;
  }

  // Adds an event to the log
  add(channel, password, data) {
    let post;
    if(data instanceof Post) {
      post = data;
    } else {
      // Handle everything else as a string
      post = await(Post.create(this._ipfs, Post.Types.Message, data));
    }
    return await(this._write(channel, password, OpTypes.Add, post.Hash, post.Hash));
  }

  // Sets a key-value pair
  put(channel, password, key, data) {
    const post = await(Post.create(this._ipfs, Post.Types.Message, data));
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

    // var _fetchAsync = async(() => {
    //   return new Promise(async((resolve, reject) => {
    //     const handle = sequence
    //       .async()
    //       .map(async((f) => await(f.fetchPayload()))) // IO - fetch the actual OP from ipfs. consider merging with LL.
    //       .skipWhile((f) => key && f.key !== key) // Drop elements until we have the first one requested
    //       .map(_createLWWSet) // Return items as LWW (ignore values after the first found)
    //       // .filter((f) => f !== null) // Make sure we don't have empty ones
    //       .drop(inclusive ? 0 : 1) // Drop the 'gt/lt' item, include 'gte/lte' item
    //       .take(amount)
    //       .toArray();
    //     handle.onComplete(resolve);
    //   }));
    // })
    // return await(_fetchAsync());

    // Find an items from the sequence (list of operations)
    return sequence
      .map((f) => await(f.fetchPayload())) // IO - fetch the actual OP from ipfs. consider merging with LL.
      .skipWhile((f) => key && f.key !== key) // Drop elements until we have the first one requested
      .map(_createLWWSet) // Return items as LWW (ignore values after the first found)
      .filter((f) => f !== null) // Make sure we don't have empty ones
      .drop(inclusive ? 0 : 1) // Drop the 'gt/lt' item, include 'gte/lte' item
      .take(amount)
  }

  // Write an op to the db
  _write(channel, password, operation, key, value) {
    const hash = await(Operation.create(this._ipfs, this._logs[channel], this.user, operation, key, value));
    this.events[channel].emit('write', channel, hash);
    return key;
  }
}

module.exports = OrbitDB;
