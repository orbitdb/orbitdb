'use strict';

var async         = require('asyncawait/async');
var await         = require('asyncawait/await');
var ipfsDaemon    = require('./ipfs-daemon');
var ipfsAPI       = require('./ipfs-api-promised');
var HashCache     = require('./HashCacheClient');
var HashCacheItem = require('./HashCacheItem').EncryptedHashCacheItem;
var HashCacheOps  = require('./HashCacheItem').HashCacheOps;
var MetaInfo      = require('./MetaInfo');
var ItemTypes     = require('./ItemTypes');
var Keystore      = require('./Keystore');
var Post          = require('./Post');
var Encryption    = require('./Encryption');

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
      var channel = await (this.client.linkedList(channel, password).head());
      startFromHash = channel.head ? channel.head : null;
    }

    if((gt || lt) && limit > -1) limit += 1;

    if(startFromHash) {
      // Get messages
      const opts = {
        amount: limit,
        last: gte ? gte : gt,
        key: key
      };
      messages = this._fetchRecursive(startFromHash, password, opts);

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

  _fetchOne(hash, password) {
    let data = await (ipfsAPI.getObject(this.ipfs, hash));
    let item = HashCacheItem.fromEncrypted(data, pubkey, privkey, password);

    // TODO: add possibility to fetch content separately
    // fetch and decrypt content
    if(item.op === HashCacheOps.Add || item.op === HashCacheOps.Put) {
      const payload    = await (ipfsAPI.getObject(this.ipfs, item.target));
      const contentEnc = JSON.parse(payload.Data)["content"];
      const contentDec = Encryption.decrypt(contentEnc, privkey, 'TODO: pubkey');
      item.Payload     = contentDec;
    }

    return item;
  }

  // TEMP
  _contains(src, e) {
    let contains = false;
    src.forEach((a) => {
      if(a.toString() === e.toString()) contains = true;
    });
    return contains;
  }

  _fetchRecursive(hash, password, options, currentDepth, deleted) {
    const opts = {
      amount: options.amount ? options.amount : 1,
      last:   options.last ? options.last : null,
      key:    options.key ? options.key : null
    };

    let res = [];
    let handledItems = deleted ? deleted : [];

    if(!currentDepth) currentDepth = 0;

    const item = await (this._fetchOne(hash, password));

    if(item) {
      if(item.op === HashCacheOps.Delete) {
        handledItems.push(item.target);
      } else if(item.op === HashCacheOps.Add && !this._contains(handledItems, hash)) {
        res.push({ hash: hash, item: item });
        currentDepth ++;
      } else if(item.op === HashCacheOps.Put && !this._contains(handledItems, item.key)) {
        if(!opts.key || opts.key && opts.key === item.key) {
          res.push({ hash: hash, item: item });
          currentDepth ++;
          handledItems.push(item.key);
        }
      }

      if(opts.key && item.key === opts.key)
        return res;

      if(opts.last && hash === opts.last)
        return res;

      if(!opts.last && opts.amount > -1 && currentDepth >= opts.amount)
        return res;

      if(item.next) {
        const next = this._fetchRecursive(item.next, password, opts, currentDepth, handledItems);
        res = res.concat(next);
      }
    }

    return res;
  }

  _publish(data) {
    let post = new Post(data);
    post.encrypt(privkey, pubkey);
    return await (ipfsAPI.putObject(this.ipfs, JSON.stringify(post)));
  }

  _createMessage(channel, password, operation, key, target) {
    // Get the current channel head and bump the sequence number
    let seq = 0;
    const currentHead = await(this.client.linkedList(channel, password).head())
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
    const key = null;
    const post = this._publish(data);
    return this._createOperation(channel, password, HashCacheOps.Add, key, post.Hash);
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
    await(this.client.linkedList(channel, password).add(message.Hash));
    return message.Hash;
  }

  _deleteChannel(channel, password) {
    await(this.client.linkedList(channel, password).delete());
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
    return await(this.client.linkedList(channel, password).head());
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
