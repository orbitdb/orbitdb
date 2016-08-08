'use strict';

const EventEmitter  = require('events').EventEmitter;
const Logger        = require('logplease');
const logger        = Logger.create("orbit-db", { color: Logger.Colors.Magenta });
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
    if(this._pubsub) this._pubsub.disconnect();
    // this.events.removeAllListeners('load');
    // this.events.removeAllListeners('ready');
    // this.events.removeAllListeners('sync');
    // this.events.removeAllListeners('synced');
    this.events.removeAllListeners('data');
    // this.events.removeAllListeners('close');
    Object.keys(this.stores).map((e) => this.stores[e]).forEach((store) => {
      // store.events.removeAllListeners('load');
      // store.events.removeAllListeners('ready');
      // store.events.removeAllListeners('sync');
      // store.events.removeAllListeners('updated');
      store.events.removeAllListeners('data');
      // store.events.removeAllListeners('close');
    });
    this.stores = {};
    this.user = null;
    this.network = null;
  }

  _createStore(Store, dbname, options) {
    if(!options) options = {};
    const replicate = options.subscribe !== undefined ? options.subscribe : true;
    const store = new Store(this._ipfs, this.user.username, dbname, options);
    this.stores[dbname] = store;
    return this._subscribe(store, dbname, replicate);
  }

  _subscribe(store, dbname, subscribe, callback) {
    if(subscribe === undefined) subscribe = true;

    store.events.on('data',  this._onData.bind(this));
    // store.events.on('write', this._onWrite.bind(this));
    // store.events.on('sync',  this._onStartSync.bind(this));
    // store.events.on('load',  this._onLoad.bind(this));
    // store.events.on('ready', this._onReady.bind(this));
    // store.events.on('close', this._onClose.bind(this));

    if(subscribe && this._pubsub)
      this._pubsub.subscribe(dbname, '', this._onMessage.bind(this), store.options.maxHistory > 0);

    return store.use(this.user.username);
  }

  /* Replication request from the message broker */

  _onMessage(dbname, hash) {
    // console.log(".MESSAGE", dbname, hash, this.user.username);
    const store = this.stores[dbname];
    store.sync(hash).catch((e) => logger.error(e.stack));
  }

  /* Data events */

  _onWrite(dbname, hash) {
    // 'New entry written to database...', after adding a new db entry locally
    // console.log(".WRITE", dbname, hash, this.user.username);
    if(!hash) throw new Error("Hash can't be null!");
    if(this._pubsub) this._pubsub.publish(dbname, hash);
  }

  _onData(dbname, item) {
    // 'New database entry...', after a new entry was added to the database
    // console.log(".SYNCED", dbname, items.length);
    this.events.emit('data', dbname, item);
  }

  /* Status indicator events */

  // _onStartSync(dbname) {
  //   // 'Loading new entries...', before replication starts
  //   // console.log(".SYNC", dbname);
  //   this.events.emit('sync', dbname);
  // }

  // _onLoad(dbname) {
  //   // 'Loading database...', before loading initial oplog history
  //   // console.log(".LOAD", dbname);
  //   this.events.emit('load', dbname);
  // }

  // _onReady(dbname) {
  //   // 'Database loaded...', after oplog history has been constructed
  //   // console.log(".READY", dbname);
  //   this.events.emit('ready', this.stores[dbname]);
  // }

  _onClose(dbname) {
    if(this._pubsub) this._pubsub.unsubscribe(dbname);
    delete this.stores[dbname];
    // this.events.emit('closed', dbname);
  }

  _connect(hash, username, password, allowOffline) {
    if(allowOffline === undefined) allowOffline = false;

    const readNetworkInfo = (hash) => {
      return new Promise((resolve, reject) => {
        resolve(JSON.stringify({
          name: 'Orbit DEV Network',
          publishers: [hash]
        }));
      });
    };

    let host, port, name;
    return readNetworkInfo(hash)
      .then((object) => {
        this.network = JSON.parse(object);
        name = this.network.name;
        host = this.network.publishers[0].split(":")[0];
        port = this.network.publishers[0].split(":")[1];
      })
      .then(() => {
        this._pubsub = new PubSub();
        logger.debug(`Connecting to network ${hash} (${host}:${port})`);
        return this._pubsub.connect(host, port, username, password)
      })
      .then(() => {
        logger.debug(`Connected to network ${hash} (${host}:${port})`);
        this.user = { username: username, id: username } // TODO: user id from ipfs hash
        return;
      })
      .catch((e) => {
        logger.warn(`Couldn't connect to ${hash} network: ${e.message}`);
        if(!allowOffline) {
          logger.debug(`'allowOffline' set to false, terminating`);
          if(this._pubsub) this._pubsub.disconnect();
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
