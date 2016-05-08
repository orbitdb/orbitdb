'use strict';

const EventEmitter  = require('events').EventEmitter;
const logger        = require('logplease').create("orbit-db.Client");
const EventStore    = require('orbit-db-eventstore');
const FeedStore     = require('orbit-db-feedstore');
const KeyValueStore = require('orbit-db-kvstore');
const CounterStore  = require('orbit-db-counterstore');
const PubSub        = require('./PubSub');

class OrbitDB {
  constructor(ipfs) {
    this._ipfs = ipfs;
    this._pubsub = null;
    this.user = null;
    this.network = null;
    this.events = new EventEmitter();
    this.stores = {};
  }

  /* Databases */
  feed(dbname, options) {
    return this._createStore(FeedStore, dbname, options);
  }

  eventlog(dbname, options) {
    return this._createStore(EventStore, dbname, options);
  }

  kvstore(dbname, options) {
    return this._createStore(KeyValueStore, dbname, options);
  }

  counter(dbname, options) {
    return this._createStore(CounterStore, dbname, options);
  }

  disconnect() {
    this._pubsub.disconnect();
    this.stores = {};
    this.user = null;
    this.network = null;
  }

  _createStore(Store, dbname, options) {
    if(!options) options = {};
    if(options.subscribe === undefined) Object.assign(options, { subscribe: true });

    const store = new Store(this._ipfs, this.user.username, dbname, options);
    return this._subscribe(store, dbname, options.subscribe)
      .then(() => this.stores[dbname] = store)
      .then(() => store);
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

  _onWrite(dbname, hash) {
    if(!hash) throw new Error("Hash can't be null!");
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

  _connect(hash, username, password, allowOffline) {
    if(allowOffline === undefined) allowOffline = false;

    const readNetworkInfo = (hash) => {
      return new Promise((resolve, reject) => {
        this._ipfs.cat(hash).then((res) => {
          let buf = '';
          res
            .on('error', (err) => reject(err))
            .on('data', (data) => buf += data)
            .on('end', () => resolve(buf))
        });
      });
    };

    let host, port, name;
    return readNetworkInfo(hash)
      .then((network) => JSON.parse(network))
      .then((network) => {
        this.network = network;
        name = network.name;
        host = network.publishers[0].split(":")[0];
        port = network.publishers[0].split(":")[1];
      })
      .then(() => {
        this._pubsub = new PubSub();
        return this._pubsub.connect(host, port, username, password)
      })
      .then(() => {
        logger.debug(`Connected to Pubsub at '${host}:${port}'`);
        this.user = { username: username, id: username } // TODO: user id from ipfs hash
        return;
      })
      .catch((e) => {
        logger.warn("Couldn't connect to Pubsub: " + e.message);
        if(!allowOffline) {
          logger.debug("'allowOffline' set to false, terminating");
          this._pubsub.disconnect();
          throw e;
        }
        this.user = { username: username, id: username } // TODO: user id from ipfs hash
        return;
      });
  }
}

class OrbitClientFactory {
  static connect(network, username, password, ipfs, options) {
    if(!options) options = { allowOffline: false };

    if(!ipfs) {
      logger.error("IPFS instance not provided");
      throw new Error("IPFS instance not provided");
    }

    const client = new OrbitDB(ipfs);
    return client._connect(network, username, password, options.allowOffline)
      .then(() => client)
  }
}

module.exports = OrbitClientFactory;
