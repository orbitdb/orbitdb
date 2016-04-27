'use strict';

const EventEmitter  = require('events').EventEmitter;
const logger        = require('logplease').create("orbit-db.Client");
const PubSub        = require('./PubSub');
const CounterStore  = require('./stores/counters/CounterStore');
const KeyValueStore = require('./stores/kvstore/KeyValueStore');
const EventStore    = require('./stores/eventlog/EventStore');

class Client {
  constructor(ipfs, options) {
    this._ipfs = ipfs;
    this._pubsub = null;
    this.user = null;
    this.network = null;
    this.events = new EventEmitter();
    this.kvStore = new KeyValueStore(this._ipfs, options);
    this.eventStore = new EventStore(this._ipfs, options);
    this.counterStore = new CounterStore(this._ipfs, options);
  }

  eventlog(dbname, subscribe) {
    const db = this.eventStore;
    const api = {
      iterator: (options) => db.iterator(dbname, options),
      add: (data) => db.add(dbname, data),
      del: (hash) => db.remove(dbname, hash),
      delete: () => db.delete(dbname),
      close: () => this._pubsub.unsubscribe(dbname)
    }

    return this._subscribe(db, dbname, subscribe).then(() => api);
  }

  kvstore(dbname, subscribe) {
    const db = this.kvStore;
    const api = {
      put: (key, value) => db.put(dbname, key, value),
      set: (key, value) => db.set(dbname, key, value), // alias for put()
      get: (key) => db.get(dbname, key),
      del: (key) => db.del(dbname, key),
      delete: () => db.delete(dbname),
      close: () => this._pubsub.unsubscribe(dbname)
    }

    return this._subscribe(db, dbname, subscribe).then(() => api);
  }

  counter(dbname, subscribe) {
    const db = this.counterStore;
    const api = {
      value: () => db.query(dbname),
      inc: (amount) => db.inc(dbname, amount),
      dec: (amount) => console.log("dec() not implemented yet"),
      delete: () => db.delete(dbname),
      close: () => this._pubsub.unsubscribe(dbname),
    }

    return this._subscribe(db, dbname, subscribe).then(() => api);
  }

  disconnect() {
    this._pubsub.disconnect();
    this._store = {};
    this.user = null;
    this.network = null;
  }

  _subscribe(db, dbname, subscribe, callback) {
    if(subscribe === undefined) subscribe = true;

    return db.use(dbname, this.user.username).then((events) => {
      events.on('readable', this._onSync.bind(this));
      events.on('data',     this._onWrite.bind(this));
      events.on('load',     this._onLoad.bind(this));

      if(subscribe)
        this._pubsub.subscribe(dbname, '', this._onMessage.bind(this));

      return;
    });
  }

  _onMessage(channel, message) {
    [this.eventStore, this.kvStore, this.counterStore].forEach((db) => {
      db.sync(channel, message).catch((e) => logger.error(e.stack));
    })
  }

  _onWrite(channel, hash) {
    this._pubsub.publish(channel, hash);
    this.events.emit('data', channel, hash);
  }

  _onSync(channel, hash) {
    this.events.emit('readable', channel, hash);
  }

  _onLoad(channel, hash) {
    this.events.emit('load', channel, hash);
  }

  _connect(host, port, username, password, allowOffline) {
    return new Promise((resolve, reject) => {
      if(allowOffline === undefined) allowOffline = false;

      this._pubsub = new PubSub(this._ipfs);
      this._pubsub.connect(host, port, username, password).then(() => {
        logger.debug(`Connected to Pubsub at '${host}:${port}'`);
        this.user = { username: username, id: username } // TODO: user id from ipfs hash
        this.network = { host: host, port: port, name: 'TODO: network name' }
        resolve();
      }).catch((e) => {
        logger.warn("Couldn't connect to Pubsub:", e.message);
        if(!allowOffline) {
          logger.debug("'allowOffline' set to false, terminating");
          this._pubsub.disconnect();
          reject(e);
          return;
        }
        this.user = { username: username, id: username } // TODO: user id from ipfs hash
        this.network = { host: host, port: port, name: 'TODO: network name' }
        resolve();
      });
    });
  }
}

class OrbitClientFactory {
  static connect(host, port, username, password, ipfs, options) {
    const createClient =(ipfs) => {
      return new Promise((resolve, reject) => {
        const client = new Client(ipfs, options);
        client._connect(host, port, username, password, options.allowOffline)
          .then(() => resolve(client))
          .catch(reject);
      });
    }

    options = options ? options : {};

    if(!ipfs) {
      logger.error("IPFS instance not provided");
      throw new Error("IPFS instance not provided");
    }

    return createClient(ipfs);
  }
}

module.exports = OrbitClientFactory;
