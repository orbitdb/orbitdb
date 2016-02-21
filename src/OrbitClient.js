'use strict';

var async         = require('asyncawait/async');
var await         = require('asyncawait/await');
var Keystore      = require('orbit-common/lib/Keystore');
var Encryption    = require('orbit-common/lib/Encryption');
var ipfsDaemon    = require('orbit-common/lib/ipfs-daemon');
var ipfsAPI       = require('orbit-common/lib/ipfs-api-promised');
var HashCacheItem = require('./HashCacheItem').HashCacheItem;
var OrbitDBItem   = require('./HashCacheItem').OrbitDBItem;
var HashCacheOps  = require('./HashCacheOps');
var ItemTypes     = require('./ItemTypes');
var MetaInfo      = require('./MetaInfo');
var Post          = require('./Post');
var Aggregator    = require('./Aggregator');
var PubSub        = require('./PubSub');
var Timer       = require('../examples/Timer');
const List = require('./list/OrbitList');
const DataStore = require('./DataStore');

var pubkey  = Keystore.getKeys().publicKey;
var privkey = Keystore.getKeys().privateKey;

class OrbitClient {
  constructor(ipfs) {
    this._ipfs = ipfs;
    this.network = {};
    this.user = null;
  }

  channel(hash, password) {
    if(password === undefined) password = '';

    this._pubsub.subscribe(hash, password, async((hash, message) => {
      const other = await(List.fromIpfsHash(this._ipfs, message));
      // console.log(">", other.id, other.seq, other.ver);
      if(other.id !== this.user.username) {
        // let timer = new Timer(true);
        this._store.join(other);
        // console.log(`Join took ${timer.stop(true)} ms`);
      }
    }));

    return {
      // info: (options) => this._info(hash, password),
      delete: () => this._deleteChannel(hash, password),
      iterator: (options) => this._iterator(hash, password, options),
      setMode: (mode) => this._setMode(hash, password, mode),
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
    // console.log("M", messages)

    // Remove the first/last item if greater/lesser than is set
    let startIndex = lt ? 1 : 0;
    let endIndex   = gt ? messages.length - 1 : messages.length;
    messages = messages.slice(startIndex, endIndex)
    // console.log("M2", messages)

    if(!reverse) messages.reverse();

    return messages;
  }

  _publish(data) {
    let post = new Post(data);
    // post.encrypt(privkey, pubkey);
    return await (ipfsAPI.putObject(this._ipfs, JSON.stringify(post)));
  }

  _createMessage(channel, password, operation, key, value) {
    // Create meta info
    const size = -1;
    const metaInfo = new MetaInfo(ItemTypes.Message, size, this.user.id, new Date().getTime());
    // Create the hash cache item
    const item = new OrbitDBItem(operation, key, value, metaInfo);
    // Save the item to ipfs
    const data = await (ipfsAPI.putObject(this._ipfs, JSON.stringify(item)));
    return data.Hash;
  }

  /* DB Operations */
  _add(channel, password, data) {
    const post = this._publish(data);
    const key = post.Hash;
    return await(this._createOperation(channel, password, HashCacheOps.Add, key, post.Hash, data));
  }

  _put(channel, password, key, data) {
    const post = this._publish(data);
    return await(this._createOperation(channel, password, HashCacheOps.Put, key, post.Hash));
  }

  _remove(channel, password, hash) {
    return await(this._createOperation(channel, password, HashCacheOps.Delete, hash, null));
  }

  _createOperation(channel, password, operation, key, value, data) {
    let hash = this._createMessage(channel, password, operation, key, value);
    this._store.add(hash);
    const listHash = await(this._store.list.getIpfsHash());
    await(this._pubsub.publish(channel, listHash));
    return key;
  }

  _deleteChannel(channel, password) {
    this._store.clear();
    return true;
  }

  // _setMode(channel, password, modes) {
  //   let m = [];
  //   if(typeof modes !== 'Array')
  //     m.push(modes);
  //   else
  //     m = modes;
  //   // const res = await(this.client.linkedList(channel, password).setMode(m));
  //   // return res.modes;
  //   return { todo: 'TODO!' }
  // }

  // _info(channel, password) {
  //   var l = this._pubsub.latest(channel);
  //   return l;
  // }

  _connect(host, port, username, password) {
    return new Promise((resolve, reject) => {
      this._pubsub = new PubSub(this._ipfs, host, port, username, password);
      // this.client = this._pubsub._client;
      // this.user = this.client.info.user;
      this.user = { id: 'hello-todo', username: username }
      this._store = new DataStore(username, this._ipfs);
      resolve();
      // this.network = {
      //   id: this.client.info.networkId,
      //   name: this.client.info.name,
      //   config: this.client.info.config
      // };
      // setTimeout(() => {
      //   resolve();
      // }, 1000);
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
