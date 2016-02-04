'use strict';

var async         = require('asyncawait/async');
var await         = require('asyncawait/await');
var Keystore      = require('orbit-common/lib/Keystore');
var Encryption    = require('orbit-common/lib/Encryption');
var ipfsDaemon    = require('orbit-common/lib/ipfs-daemon');
var ipfsAPI       = require('orbit-common/lib/ipfs-api-promised');
var HashCache     = require('./HashCacheClient');
var HashCacheItem = require('./HashCacheItem').EncryptedHashCacheItem;
var HashCacheOps  = require('./HashCacheOps');
var ItemTypes     = require('./ItemTypes');
var MetaInfo      = require('./MetaInfo');
var Post          = require('./Post');
var Aggregator    = require('./Aggregator');
var PubSub        = require('./PubSub');

var pubkey  = Keystore.getKeys().publicKey;
var privkey = Keystore.getKeys().privateKey;

class OrbitClient {
  constructor(ipfs) {
    this.ipfs = ipfs;
    this.network = {};
    this.user = null;
  }

  channel(hash, password) {
    if(password === undefined) password = '';
    return {
      info: (options) => this._info(hash, password),
      delete: () => this._deleteChannel(hash, password),
      iterator: (options) => this._iterator(hash, password, options),
      setMode: (mode) => this._setMode(hash, password, mode),
      add: (data) => this._add(hash, password, data),
      //TODO: tests
      remove: (options) => this._remove(hash, password, options),
      put: (key, data) => this._put(hash, password, key, data),
      get: (key, options) => {
        const items = this._iterator(hash, password, { key: key }).collect();
        return items[0] ? items[0].item.Payload : null;
      },
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
      // TODO: add first() and last() ?
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

    let startFromHash;
    if(lt || lte) {
      startFromHash = lte ? lte : lt;
    } else {
      // var channel = await (this.client.linkedList(channel, password).head());
      var channel = PubSub.latest(channel);
      startFromHash = channel.head ? channel.head : null;
    }

    if((gt || lt) && limit > -1) limit += 1;

    if(startFromHash) {
      const opts = {
        amount: limit,
        last: gte ? gte : gt,
        key: key
      };

      // Get messages
      messages = Aggregator.fetchRecursive(this.ipfs, startFromHash, password, opts);

      // Slice the array
      let startIndex = 0;
      let endIndex   = messages.length;
      if(limit < 0) {
        endIndex = messages.length - (gt ? 1 : 0);
      } else {
        startIndex = Math.max(0, messages.length - limit);
        endIndex   = messages.length - ((gt || lt) ? 1 : 0);
      }

      messages = messages.slice(startIndex, endIndex)
    }

    if(reverse) messages.reverse();

    return messages;
  }

  _publish(data) {
    let post = new Post(data);
    post.encrypt(privkey, pubkey);
    return await (ipfsAPI.putObject(this.ipfs, JSON.stringify(post)));
  }

  _createMessage(channel, password, operation, key, target) {
    // Get the current channel head and bump the sequence number
    let seq = 0;
    // const currentHead = await(this.client.linkedList(channel, password).head())
    const currentHead = PubSub.latest(channel);
    if(currentHead.head) {
      const headItem = await (ipfsAPI.getObject(this.ipfs, currentHead.head));
      seq = JSON.parse(headItem.Data)["seq"] + 1;
    }

    // Create meta info
    const size = -1;
    const metaInfo = new MetaInfo(ItemTypes.Message, size, new Date().getTime());

    // Create the hash cache item
    const hcItem = new HashCacheItem(operation, key, seq, target, metaInfo, null, pubkey, privkey, password);

    // Save the item to ipfs
    const data = await (ipfsAPI.putObject(this.ipfs, JSON.stringify(hcItem)));
    let newHead = { Hash: data.Hash };

    // If this is not the first item in the channel, patch with the previous (ie. link as next)
    if(seq > 0)
      newHead = await (ipfsAPI.patchObject(this.ipfs, data.Hash, currentHead.head));

    return newHead;
  }

  /* DB Operations */
  _add(channel, password, data) {
    const post = this._publish(data);
    const key = post.Hash;
    this._createOperation(channel, password, HashCacheOps.Add, key, post.Hash);
    return key;
  }

  _put(channel, password, key, data) {
    const post = this._publish(data);
    return this._createOperation(channel, password, HashCacheOps.Put, key, post.Hash);
  }

  _remove(channel, password, options) {
    const key = null;
    const target = options.key ? options.key : (options.hash ? options.hash : null);
    return this._createOperation(channel, password, HashCacheOps.Delete, key, target);
  }

  _createOperation(channel, password, operation, key, value) {
    const message = this._createMessage(channel, password, operation, key, value);
    // await(this.client.linkedList(channel, password).add(message.Hash));
    PubSub.publish(channel, message.Hash)
    return message.Hash;
  }

  _deleteChannel(channel, password) {
    // await(this.client.linkedList(channel, password).delete());
    PubSub.delete(channel);
    return true;
  }

  _setMode(channel, password, modes) {
    let m = [];
    if(typeof modes !== 'Array')
      m.push(modes);
    else
      m = modes;
    const res = await(this.client.linkedList(channel, password).setMode(m));
    return res.modes;
  }

  _info(channel, password) {
    // return await(this.client.linkedList(channel, password).head());
    var l = PubSub.latest(channel);
    return l;
  }

  _connect(host, username, password) {
    this.client = await(HashCache.connect(host, username, password));
    this.user = this.client.info.user;
    this.network = {
      id: this.client.info.networkId,
      name: this.client.info.name,
      config: this.client.info.config
    };
  }
}

class OrbitClientFactory {
  static connect(host, username, password, ipfs) {
    if(!ipfs) {
      let ipfsd = await(ipfsDaemon());
      ipfs = ipfsd.daemon;
    }

    const client = new OrbitClient(ipfs);
    await(client._connect(host, username, password))
    return client;
  }
}

module.exports = OrbitClientFactory;
