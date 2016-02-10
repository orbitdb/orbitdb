'use strict';

var a             = require('async');
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

let vvv = {};

class OrbitClient {
  constructor(ipfs) {
    this.ipfs = ipfs;
    this.network = {};
    this.user = null;
  }

  channel(hash, password) {
    if(password === undefined) password = '';

    this._pubsub.subscribe(hash, password);

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
    if(lte || lt) {
      startFromHash = lte ? lte : lt;
    } else {
      var channel = this._info(channel, password);
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
    // Create meta info
    const size = -1;
    const metaInfo = new MetaInfo(ItemTypes.Message, size, this.user.id, new Date().getTime());

    // Get the current channel head and bump the sequence number
    let seq = this._info(channel, password).seq + 1;
    let head = this._info(channel, password).head;

    // Create the hash cache item
    const hcItem = new HashCacheItem(operation, key, seq, target, metaInfo, null, pubkey, privkey, password);

    // Save the item to ipfs
    const data = await (ipfsAPI.putObject(this.ipfs, JSON.stringify(hcItem)));
    let newHead = { Hash: data.Hash };

    // If this is not the first item in the channel, patch with the previous (ie. link as next)
    if(seq > 0)
      newHead = await (ipfsAPI.patchObject(this.ipfs, data.Hash, head));

    return { hash: newHead, seq: seq };
  }

  /* DB Operations */
  _add(channel, password, data) {
    const post = this._publish(data);
    const key = post.Hash;
    await(this._createOperation(channel, password, HashCacheOps.Add, key, post.Hash, data));
    return key;
  }

  _put(channel, password, key, data) {
    const post = this._publish(data);
    return await(this._createOperation(channel, password, HashCacheOps.Put, key, post.Hash));
  }

  _remove(channel, password, options) {
    const key = null;
    const target = options.key ? options.key : (options.hash ? options.hash : null);
    return this._createOperation(channel, password, HashCacheOps.Delete, key, target);
  }

  _createOperation(channel, password, operation, key, value, data) {
    let message, res = false;
    while(!res) {
      message = this._createMessage(channel, password, operation, key, value);
      res = await(this._pubsub.publish(channel, message.hash, message.seq));
    }
    return message.Hash;
  }

  _deleteChannel(channel, password) {
    this._pubsub.delete(channel, password);
    return true;
  }

  _setMode(channel, password, modes) {
    let m = [];
    if(typeof modes !== 'Array')
      m.push(modes);
    else
      m = modes;
    // const res = await(this.client.linkedList(channel, password).setMode(m));
    // return res.modes;
    return { todo: 'TODO!' }
  }

  _info(channel, password) {
    var l = this._pubsub.latest(channel, password);
    return l;
  }

  _connect(host, port, username, password) {
    this._pubsub = new PubSub(this.ipfs, host, port, username, password);
    // this.client = this._pubsub._client;
    // this.user = this.client.info.user;
    this.user = { id: 'hello' }
    // this.network = {
    //   id: this.client.info.networkId,
    //   name: this.client.info.name,
    //   config: this.client.info.config
    // };
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
