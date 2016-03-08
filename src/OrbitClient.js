'use strict';

const EventEmitter = require('events').EventEmitter;
const async        = require('asyncawait/async');
const await        = require('asyncawait/await');
const ipfsDaemon   = require('orbit-common/lib/ipfs-daemon');
const PubSub       = require('./PubSub');
const OrbitDB      = require('./OrbitDB');

require('http').globalAgent.maxSockets = 10;

class OrbitClient {
  constructor(ipfs, daemon) {
    this._ipfs = ipfs;
    this._pubsub = null;
    this.user = null;
    this.network = null;
    this.events = new EventEmitter();
    this.db = new OrbitDB(this._ipfs);
  }

  channel(channel, password, subscribe) {
    if(password === undefined) password = '';
    if(subscribe === undefined) subscribe = true;

    this.db.use(channel, this.user, password);
    this.db.events[channel].on('write', this._onWrite.bind(this));
    this.db.events[channel].on('sync', this._onSync.bind(this));

    if(subscribe)
      this._pubsub.subscribe(channel, password, async((channel, message) => this.db.sync(channel, message)));

    return {
      iterator: (options) => this._iterator(channel, password, options),
      delete: () => this.db.deleteChannel(channel, password),
      del: (key) => this.db.del(channel, password, key),
      add: (data) => this.db.add(channel, password, data),
      put: (key, data) => this.db.put(channel, password, key, data),
      get: (key, options) => {
        const items = this._iterator(channel, password, { key: key }).collect();
        return items[0] ? items[0].value : null;
      },
      subscribe: () => {
      },
      leave: () => this._pubsub.unsubscribe(channel)
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
      if(!allowOffline) throw e;
    }
    this.user = { username: username, id: 'TODO: user id' }
    this.network = { host: host, port: port, name: 'TODO: network name' }
  }
}

class OrbitClientFactory {
  static connect(host, port, username, password, allowOffline, ipfs) {
    if(!ipfs) {
      let ipfsd = await(ipfsDaemon());
      ipfs = ipfsd.ipfs;
    }

    const client = new OrbitClient(ipfs);
    await(client._connect(host, port, username, password, allowOffline))
    return client;
  }
}

module.exports = OrbitClientFactory;
