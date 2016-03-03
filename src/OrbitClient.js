'use strict';

const EventEmitter = require('events').EventEmitter;
const async        = require('asyncawait/async');
const await        = require('asyncawait/await');
const ipfsDaemon   = require('orbit-common/lib/ipfs-daemon');
const ipfsAPI      = require('orbit-common/lib/ipfs-api-promised');
const Operations   = require('./list/Operations');
const List         = require('./list/OrbitList');
const OrbitDBItem  = require('./db/OrbitDBItem');
const ItemTypes    = require('./db/ItemTypes');
const MetaInfo     = require('./db/MetaInfo');
const Post         = require('./db/Post');
const PubSub       = require('./PubSub');

class OrbitDB {
  constructor(ipfs, daemon) {
    this._ipfs = ipfs;
    this._store = {};
    this._pubsub = null;
    this.user = null;
    this.network = null;
    this.events = new EventEmitter();
  }

  channel(hash, password, subscribe) {
    if(password === undefined) password = '';
    if(subscribe === undefined) subscribe = true;

    this._store[hash] = new List(this._ipfs, this.user.username);

    const onMessage = async((hash, message) => {
      // console.log("--> Head:", message)
      if(message && this._store[hash]) {
        const other = List.fromIpfsHash(this._ipfs, message);
        this._store[hash].join(other);
      }
      this.events.emit('data', hash, message);
    });

    if(subscribe)
      this._pubsub.subscribe(hash, password, onMessage, onMessage);

    return {
      iterator: (options) => this._iterator(hash, password, options),
      delete: () => this._deleteChannel(hash, password),
      add: (data) => this._add(hash, password, data),
      del: (key) => this._remove(hash, password, key),
      put: (key, data) => this._put(hash, password, key, data),
      get: (key, options) => {
        const items = this._iterator(hash, password, { key: key }).collect();
        return items[0] ? items[0].payload.value : null;
      },
      //TODO: tests
      leave: () => this._pubsub.unsubscribe(hash)
    }
  }

  disconnect() {
    this._pubsub.disconnect();
    this._store = {};
    this.user = null;
    this.network = null;
  }

  _iterator(channel, password, options) {
    const messages = this._getMessages(channel, password, options);
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

  _getMessages(channel, password, options) {
    let opts = options || {};
    Object.assign(opts, { amount: opts.limit || 1 });
    let messages = await(this._store[channel].findAll(opts));
    if(opts.reverse) messages.reverse();
    return messages;
  }

  _publish(data) {
    return new Promise((resolve, reject) => {
      let post = new Post(data);
      // post.encrypt(privkey, pubkey);
      const res = await (ipfsAPI.putObject(this._ipfs, JSON.stringify(post)));
      resolve(res);
    })
  }

  _createMessage(channel, password, operation, key, value) {
    const size = -1;
    const meta = new MetaInfo(ItemTypes.Message, size, this.user.username, new Date().getTime());
    const item = new OrbitDBItem(operation, key, value, meta);
    const data = await (ipfsAPI.putObject(this._ipfs, JSON.stringify(item)));
    return data.Hash;
  }

  /* DB Operations */
  _add(channel, password, data) {
    const post = await(this._publish(data));
    const key = post.Hash;
    return await(this._createOperation(channel, password, Operations.Add, key, post.Hash, data));
  }

  _put(channel, password, key, data) {
    const post = await(this._publish(data));
    return await(this._createOperation(channel, password, Operations.Put, key, post.Hash));
  }

  _remove(channel, password, hash) {
    return await(this._createOperation(channel, password, Operations.Delete, hash, null));
  }

  _createOperation(channel, password, operation, key, value, data) {
    var createOperation = async(() => {
      return new Promise(async((resolve, reject) => {
        const hash = this._createMessage(channel, password, operation, key, value);
        const res = await(this._store[channel].add(hash));
        const listHash = await(this._store[channel].ipfsHash);
        await(this._pubsub.publish(channel, listHash));
        resolve();
      }));
    })
    await(createOperation());
    return key;
    // return res;
  }

  _deleteChannel(channel, password) {
    this._store[channel].clear();
    return true;
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

    const client = new OrbitDB(ipfs);
    await(client._connect(host, port, username, password, allowOffline))
    return client;
  }
}

module.exports = OrbitClientFactory;
