'use strict';

const async        = require('asyncawait/async');
const await        = require('asyncawait/await');
const Keystore     = require('orbit-common/lib/Keystore');
const Encryption   = require('orbit-common/lib/Encryption');
const ipfsDaemon   = require('orbit-common/lib/ipfs-daemon');
const ipfsAPI      = require('orbit-common/lib/ipfs-api-promised');
const OrbitDBItem  = require('./HashCacheItem').OrbitDBItem;
const HashCacheOps = require('./HashCacheOps');
const ItemTypes    = require('./ItemTypes');
const MetaInfo     = require('./MetaInfo');
const Post         = require('./Post');
const PubSub       = require('./PubSub');
const List         = require('./list/OrbitList');
const DataStore    = require('./DataStore');

const pubkey  = Keystore.getKeys().publicKey;
const privkey = Keystore.getKeys().privateKey;

class OrbitClient {
  constructor(ipfs) {
    this._ipfs = ipfs;
    this.user = null;
  }

  channel(hash, password) {
    if(password === undefined) password = '';

    const onMessage = async((hash, message) => {
      const other = await(List.fromIpfsHash(this._ipfs, message));
      if(other.id !== this.user.username) {
        this._store.join(other);
      }
    });

    const onLatest = async((hash, message) => {
      console.log("--> Received latest list:", message)
      if(message) {
        const other = await(List.fromIpfsHash(this._ipfs, message));
        this._store.join(other);
      }
    });

    this._pubsub.subscribe(hash, password, onMessage, onLatest);

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
    let messages = [];

    if(!options) options = {};

    // Options
    let limit     = options.limit ? options.limit : 1;
    const gt      = options.gt ? options.gt : null;
    const gte     = options.gte ? options.gte : null;
    const lt      = options.lt ? options.lt : null;
    const lte     = options.lte ? options.lte : null;
    const reverse = options.reverse ? options.reverse : false;
    const key     = options.key ? options.key : null;

    if((gt || lt) && limit > -1) limit += 1;

    const opts = {
      amount: limit,
      first: lte ? lte : lt,
      last: gte ? gte : gt,
      key: key
    };

    // Get messages
    messages = await(this._store.get(opts));

    // Remove the first/last item if greater/lesser than is set
    let startIndex = lt ? 1 : 0;
    let endIndex   = gt ? messages.length - 1 : messages.length;
    messages = messages.slice(startIndex, endIndex)

    if(!reverse) messages.reverse();

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
    return await(this._createOperation(channel, password, HashCacheOps.Add, key, post.Hash, data));
  }

  _put(channel, password, key, data) {
    const post = await(this._publish(data));
    return await(this._createOperation(channel, password, HashCacheOps.Put, key, post.Hash));
  }

  _remove(channel, password, hash) {
    return await(this._createOperation(channel, password, HashCacheOps.Delete, hash, null));
  }

  _createOperation(channel, password, operation, key, value, data) {
    var create = async(() => {
      return new Promise(async((resolve, reject) => {
        const hash = this._createMessage(channel, password, operation, key, value);
        const res = await(this._store.add(hash));
        const listHash = await(this._store.list.getIpfsHash());
        await(this._pubsub.publish(channel, listHash));
        resolve();
      }));
    })
    await(create());
    return key;
    // return res;
  }

  _deleteChannel(channel, password) {
    this._store.clear();
    return true;
  }

  _connect(host, port, username, password) {
    return new Promise((resolve, reject) => {
      this.user = { username: username, id: 'hello-todo' }
      this._pubsub = new PubSub(this._ipfs, host, port, username, password);
      this._store  = new DataStore(username, this._ipfs);
      resolve();
    });
  }
}

class OrbitClientFactory {
  static connect(host, port, username, password, ipfs) {
    if(!ipfs) {
      let ipfsd = await(ipfsDaemon());
      ipfs = ipfsd.daemon;
    }

    const client = new OrbitClient(ipfs);
    await(client._connect(host, port, username, password))
    return client;
  }
}

module.exports = OrbitClientFactory;
