'use strict';

const EventEmitter = require('events').EventEmitter;
const async        = require('asyncawait/async');
const await        = require('asyncawait/await');
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

    await(this.db.use(channel, this.user, password));
    this.db.events[channel].on('write', this._onWrite.bind(this));
    this.db.events[channel].on('sync', this._onSync.bind(this));
    this.db.events[channel].on('load', this._onLoad.bind(this));
    this.db.events[channel].on('loaded', this._onLoaded.bind(this));

    if(subscribe)
      this._pubsub.subscribe(channel, password, async((channel, message) => this.db.sync(channel, message)));

    return {
      iterator: (options) => this._iterator(channel, password, options),
      delete: () => this.db.deleteChannel(channel, password),
      del: (key) => this.db.del(channel, password, key),
      add: (data) => this.db.add(channel, password, data),
      put: (key, data) => this.db.put(channel, password, key, data),
      get: (key) => {
        const items = this._iterator(channel, password, { key: key }).collect();
        return items[0] ? items[0] : null;
      },
      close: () => this._pubsub.unsubscribe(channel)
    }
  }

  disconnect() {
    this._pubsub.disconnect();
    this._store = {};
    this.user = null;
    this.network = null;
  }

  _onWrite(channel, hash) {
    this._pubsub.publish(channel, hash);
    this.events.emit('data', channel, hash);
  }

  _onSync(channel, hash) {
    this.events.emit('data', channel, hash);
  }

  _onLoad(channel, hash) {
    // console.log("Loading #" + channel, hash)
    this.events.emit('load', channel, hash);
  }

  _onLoaded(channel, hash) {
    // console.log("Finished loading #" + channel, hash)
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
    if(allowOffline === undefined) allowOffline = false;
    try {
      this._pubsub = new PubSub(this._ipfs);
      await(this._pubsub.connect(host, port, username, password));
    } catch(e) {
      if(!allowOffline) {
        this._pubsub.disconnect();
        throw e;
      }
    }
    this.user = { username: username, id: username } // TODO: user id from ipfs hash
    this.network = { host: host, port: port, name: 'TODO: network name' }
  }
}

class OrbitClientFactory {
  static connect(host, port, username, password, ipfs, options) {
    options = options ? options : {};
    if(!ipfs) {
      let ipfsd = await(ipfsDaemon());
      ipfs = ipfsd.ipfs;
    }

    const client = new Client(ipfs, options);
    await(client._connect(host, port, username, password, options.allowOffline))
    return client;
  }
}

module.exports = OrbitClientFactory;
