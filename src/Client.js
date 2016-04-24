'use strict';

const EventEmitter = require('events').EventEmitter;
const logger       = require('logplease').create("orbit-db.Client");
const PubSub       = require('./PubSub');
const OrbitDB      = require('./OrbitDB');
const CounterDB    = require('./db/CounterDB');
const KeyValueDB   = require('./db/KeyValueDB');

class Client {
  constructor(ipfs, options) {
    this._ipfs = ipfs;
    this._pubsub = null;
    this.user = null;
    this.network = null;
    this.events = new EventEmitter();
    this.options = options || {};
    this.db = new OrbitDB(this._ipfs, this.options);
    this.counterDB = new CounterDB(this._ipfs, this.options);
    this.keyvalueDB = new KeyValueDB(this._ipfs, this.options);
  }

  kvstore(dbname, subscribe) {
    const db = this.keyvalueDB;
    const api = {
      put: (key, value) => db.put(dbname, key, value),
      set: (key, value) => db.set(dbname, key, value), // alias for put()
      get: (key) => db.query(dbname, { key: key }),
      del: (key) => db.del(dbname, key),
      delete: () => db.delete(dbname),
      close: () => this._pubsub.unsubscribe(dbname)
    }

    return this._subscribe(db, dbname, subscribe).then(() => api);
  }

  counter(dbname, subscribe) {
    const db = this.counterDB;
    const api = {
      value: () => db.query(dbname),
      inc: (amount) => db.inc(dbname, amount),
      dec: (amount) => console.log("dec() not implemented yet"),
      delete: () => db.delete(dbname),
      close: () => this._pubsub.unsubscribe(dbname),
    }

    return this._subscribe(db, dbname, subscribe).then(() => api);
  }

  channel(channel, password, subscribe) {
    if(password === undefined) password = '';
    if(subscribe === undefined) subscribe = true;

    const api = {
      iterator: (options) => this._iterator(channel, password, options),
      delete: () => this.db.deleteChannel(channel, password),
      del: (key) => this.db.del(channel, password, key),
      add: (data) => this.db.add(channel, password, data),
      put: (key, value) => this.db.put(channel, password, key, value),
      get: (key) => {
        const items = this._iterator(channel, password, { key: key }).collect();
        return items[0] ? items[0] : null;
      },
      close: () => this._pubsub.unsubscribe(channel)
    }

    return new Promise((resolve, reject) => {
      // Hook to the events from the db and pubsub
      this.db.use(channel, this.user).then(() => {
        this.db.events[channel].on('write',  this._onWrite.bind(this));
        this.db.events[channel].on('sync',   this._onSync.bind(this));
        this.db.events[channel].on('load',   this._onLoad.bind(this));
        this.db.events[channel].on('loaded', this._onLoaded.bind(this));

        if(subscribe)
          this._pubsub.subscribe(channel, password, this._onMessage.bind(this));

        resolve(api);
      }).catch(reject);
    });
  }

  disconnect() {
    this._pubsub.disconnect();
    this._store = {};
    this.user = null;
    this.network = null;
  }

  _subscribe(db, dbname, subscribe, callback) {
    if(subscribe === undefined) subscribe = true;

    return db.use(dbname, this.user).then(() => {
      db.events[dbname].on('write',  this._onWrite.bind(this));
      db.events[dbname].on('sync',   this._onSync.bind(this));
      db.events[dbname].on('load',   this._onLoad.bind(this));
      db.events[dbname].on('loaded', this._onLoaded.bind(this));

      if(subscribe)
        this._pubsub.subscribe(dbname, '', this._onMessage.bind(this));

      return;
    });
  }

  _onMessage(channel, message) {
    this.db.sync(channel, message);
    this.counterDB.sync(channel, message);
  }

  _onWrite(channel, hash) {
    this._pubsub.publish(channel, hash);
    this.events.emit('data', channel, hash);
  }

  _onSync(channel, hash) {
    this.events.emit('data', channel, hash);
  }

  _onLoad(channel, hash) {
    this.events.emit('load', channel, hash);
  }

  _onLoaded(channel, hash) {
    this.events.emit('loaded', channel, hash);
  }

  _iterator(channel, password, options) {
    const messages = this.db.query(channel, password, options);
    let currentIndex = 0;
    let iterator = {
      [Symbol.iterator]() {
        return this;
      },
      next() {
        let item = { value: null, done: true };
        if(currentIndex < messages.length) {
          item = { value: messages[currentIndex], done: false };
          currentIndex ++;
        }
        return item;
      },
      collect: () => messages
    }

    return iterator;
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
