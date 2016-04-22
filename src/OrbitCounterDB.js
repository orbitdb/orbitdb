'use strict';

const Lazy         = require('lazy.js');
const EventEmitter = require('events').EventEmitter;
const logger       = require('logplease').create("orbit-db.OrbitDB");
const Log          = require('ipfs-log');
const DBOperation  = require('./db/Operation');
const Post         = require('./post/Post');
const Cache        = require('./Cache');
const OrbitDB      = require('./OrbitDB');
const Counter      = require('./GCounter.js');

class LogAggregator {
  constructor(ipfs, options) {
    this.id = null;
    this.options = options;
    this.events = new EventEmitter();
    this.lastWrite = null;
    this._ipfs = ipfs;
    this._log = null;
    this._cached = {};
  }

  get cached() {
    return Lazy(this._log.items).map((f) => this._cached[f.payload]).toArray();
  }

  create(user) {
    this.id = user.username;
    return Log.create(this._ipfs, this.id).then((log) => this._log = log);
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

class CounterDB {
  constructor(ipfs, options) {
    this._ipfs = ipfs;
    this.options = options || {};
    this.events = {};
    this._counters = {};
    this._aggregators = {};
  }

  /* Public methods */
  use(channel, user) {
    this.user = user;
    this.events[channel] = new EventEmitter();
    this._counters[channel] = new Counter(user.username);
    this._aggregators[channel] = new LogAggregator(this._ipfs, this.options);
    return this._aggregators[channel].create(user)
      .then(() => Cache.loadCache(this.options.cacheFile))
      .then(() => this.sync(channel, Cache.get(channel)));
  }

  sync(channel, hash) {
    // console.log("--> Head:", hash, this.user.username)
    const aggregator = this._aggregators[channel];
    const counter = this._counters[channel];
    return aggregator.sync(hash)
      .then(() => {
        return Lazy(aggregator.cached)
          .map((f) => Counter.from(f.value))
          .map((f) => counter.merge(f))
          .toArray();
      }).then(() => Cache.set(channel, hash));
  }

  _write(channel, password, operation, key, value) {
    const aggregator = this._aggregators[channel];
    const log = aggregator._log;
    return DBOperation.create(this._ipfs, log, this.user, operation, key, value)
      .then((result) => {
          aggregator._cachePayload(result.node.payload, result.op);
          return result;
      }).then((result) => {
        return Log.getIpfsHash(this._ipfs, log)
          .then((listHash) => {
            aggregator.lastWrite = listHash;
            Cache.set(channel, listHash);
            this.events[channel].emit('write', channel, listHash);
            return result;
          });
      }).then((result) => result.node.payload);
  }

  /* Operations */
  query(channel) {
    return this._counters[channel].value;
  }

  inc(channel, amount) {
    const counter = this._counters[channel];
    if(counter) {
      counter.increment(amount);
      return this._write(channel, '', DBOperation.Types.Inc, null, counter.payload);
    }
  }
}

module.exports = CounterDB;
