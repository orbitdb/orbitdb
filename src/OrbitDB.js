'use strict';

const EventEmitter  = require('events').EventEmitter;
const logger        = require('logplease').create("orbit-db.Client");
const PubSub        = require('./PubSub');
const CounterStore  = require('./stores/counters/CounterStore');
const KeyValueStore = require('./stores/kvstore/KeyValueStore');
const EventStore    = require('./stores/eventlog/EventStore');

class OrbitDB {
  constructor(ipfs, options) {
    this._ipfs = ipfs;
    this._pubsub = null;
    this.user = null;
    this.network = null;
    this.events = new EventEmitter();
    this.stores = {};
  }

  eventlog(dbname, options) {
    if(!options) options = { subscribe: true };
    const store = new EventStore(this._ipfs, dbname, options);
    return this._subscribe(store, dbname, options.subscribe)
      .then(() => this.stores[dbname] = store)
      .then(() => store);
  }

  kvstore(dbname, options) {
    if(!options) options = { subscribe: true };
    const store = new KeyValueStore(this._ipfs, dbname, options);
    return this._subscribe(store, dbname, options.subscribe)
      .then(() => this.stores[dbname] = store)
      .then(() => store);
  }

  counter(dbname, options) {
    if(!options) options = { subscribe: true };
    const store = new CounterStore(this._ipfs, dbname, options);
    return this._subscribe(store, dbname, options.subscribe)
      .then(() => this.stores[dbname] = store)
      .then(() => store);
  }

  disconnect() {
    this._pubsub.disconnect();
    this._store = {};
    this.user = null;
    this.network = null;
  }

  _subscribe(store, dbname, subscribe, callback) {
    if(subscribe === undefined) subscribe = true;

    return store.use(this.user.username).then((events) => {
      events.on('readable', this._onSync.bind(this));
      events.on('data',     this._onWrite.bind(this));
      events.on('load',     this._onLoad.bind(this));
      events.on('close',    this._onClose.bind(this));

      if(subscribe)
        this._pubsub.subscribe(dbname, '', this._onMessage.bind(this));

      return;
    });
  }

  _onMessage(dbname, message) {
    const store = this.stores[dbname];
    store.sync(message).catch((e) => logger.error(e.stack));
  }

  // TODO: FIX EVENTS!!
  _onWrite(dbname, hash) {
    this._pubsub.publish(dbname, hash);
    this.events.emit('data', dbname, hash);
  }

  _onSync(dbname, hash) {
    this.events.emit('readable', dbname, hash);
  }

  _onLoad(dbname, hash) {
    this.events.emit('load', dbname, hash);
  }

  _onClose(dbname) {
    this._pubsub.unsubscribe(dbname);
    delete this.stores[dbname];
    this.events.emit('closed', dbname);
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
        const client = new OrbitDB(ipfs, options);
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
