'use strict';

const EventEmitter = require('events').EventEmitter;
const logger       = require('orbit-common/lib/logger')("orbit-db.Client");
const ipfsDaemon   = require('orbit-common/lib/ipfs-daemon');
const PubSub       = require('./PubSub');
const OrbitDB      = require('./OrbitDB');

class Client {
  constructor(ipfs, options) {
    this._ipfs = ipfs;
    this._pubsub = null;
    this.user = null;
    this.network = null;
    this.events = new EventEmitter();
    this.options = options || {};
    this.db = new OrbitDB(this._ipfs, this.options);
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

  _onMessage(channel, message) {
    this.db.sync(channel, message);
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
      logger.debug("IPFS instance not provided, starting one");
      return ipfsDaemon().then((ipfsd) => createClient(ipfsd.ipfs));
    } else {
      return createClient(ipfs);
    }
  }
}

module.exports = OrbitClientFactory;
