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
    this.sequences = {};
    this.ipfs = ipfs;
    this.network = {};
    this.user = null;
  }

  channel(hash, password) {
    if(password === undefined) password = '';
    return {
      info: (options) => this._info(hash, password),
      iterator: (options) => this._iterator(hash, password, options),
      put: (text, options) => {
        this.sequences[hash] = !this.sequences[hash] ? this._getChannelSequence(hash, password) : this.sequences[hash] + 1;
        return this._send(hash, password, text, options);
      },
      remove: (targetHash) => {
        this.sequences[hash] = !this.sequences[hash] ? this._getChannelSequence(hash, password) : this.sequences[hash] + 1;
        return this._remove(hash, password, targetHash);
      },
      delete: () => this._delete(hash, password),
      setMode: (mode) => this._setMode(hash, password, mode)
    }
  }

  _getChannelSequence(channel, password) {
    var seq = 0
    var item = await(this.client.linkedList(channel, password).head())
    if(item.head) {
      var headItem = await (ipfsAPI.getObject(this.ipfs, item.head));
      seq = JSON.parse(headItem.Data)["seq"] + 1;
    }
    return seq;
  }

  _getMessages(channel, password, options) {
    var messages = [];

    if(!options) options = {};

    // Options
    var limit   = options.limit ? options.limit : 1;
    var gt      = options.gt ? options.gt : null;
    var gte     = options.gte ? options.gte : null;
    var lt      = options.lt ? options.lt : null;
    var lte     = options.lte ? options.lte : null;
    var reverse = options.reverse ? options.reverse : false;

    var startFromHash;
    if(lt || lte) {
      startFromHash = lte ? lte : lt;
    } else {
      var channel   = await (this.client.linkedList(channel, password).head())
      startFromHash = channel.head ? channel.head : null;
    }

    if((gt || lt) && limit > -1) limit += 1;

    if(startFromHash) {
      // Get messages
      messages = this._fetchRecursive(startFromHash, password, limit, gte ? gte : gt);

      // Slice the array
      var startIndex = 0;
      var endIndex   = messages.length;
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

  _iterator(channel, password, options) {
    var messages = this._getMessages(channel, password, options);

    // Iterator interface implementation
    var currentIndex = 0;
    let iterator = {
      [Symbol.iterator]() {
        return this;
      },
      next: () => {
        var item = { value: null, done: true };
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

  _fetchOne(hash, password) {
    var item = null;
    if(hash) {
      item = await (ipfsAPI.getObject(this.ipfs, hash));
      let data = JSON.parse(item.Data);

      // verify
      const verified = Encryption.verify(data.target, data.pubkey, data.sig, data.seq, password);
      if(!verified) throw "Item '" + hash + "' has the wrong signature"

      // decrypt
      const targetDec = Encryption.decrypt(data.target, privkey, 'TODO: pubkey');
      const metaDec   = Encryption.decrypt(data.meta, privkey, 'TODO: pubkey');
      data.target   = targetDec;
      data.meta     = JSON.parse(metaDec);

      if(data.op === HashCacheOps.Add) {
        const payload = await (ipfsAPI.getObject(this.ipfs, data.target));
        const contentEnc = JSON.parse(payload.Data)["content"];
        const contentDec = Encryption.decrypt(contentEnc, privkey, 'TODO: pubkey');
        item.Payload = contentDec;
      }

      item.Data = data;
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

  _fetchRecursive(hash, password, amount, last, currentDepth, deleted) {
    var res = [];
    var deletedItems = deleted ? deleted : [];

    if(!currentDepth) currentDepth = 0;

    var message = await (this._fetchOne(hash, password));

    if(message.Data.op === HashCacheOps.Add && !this._contains(deletedItems, hash)) {
      res.push({ hash: hash, item: message });
      currentDepth ++;
    } else if(message.Data.op === HashCacheOps.Delete) {
      deletedItems.push(message.Data.target);
    }

    if((last && hash === last))
      return res;

    if(!last && amount > -1 && currentDepth >= amount)
      return res;

    if(message && message.Links[0]) {
      var next = this._fetchRecursive(message.Links[0].Hash, password, amount, last, currentDepth, deletedItems);
      res = res.concat(next);
    }

    return res;
  }

  _publish(text) {
    var post = new Post(text);
    post.encrypt(privkey, pubkey);
    return await (ipfsAPI.putObject(this.ipfs, JSON.stringify(post)));
  }

  _createMessage(channel, password, target, operation) {
    var seq  = this.sequences[channel];
    var size = -1;
    var metaInfo = new MetaInfo(ItemTypes.Message, size, new Date().getTime());
    var hcItem   = new HashCacheItem(operation, seq, target, metaInfo, pubkey, privkey, password);
    var item     = await (ipfsAPI.putObject(this.ipfs, JSON.stringify(hcItem)));
    var newHead  = { Hash: item.Hash };

    if(seq > 0) {
      var prevHead = await(this.client.linkedList(channel, password).head());
      var headItem = await (ipfsAPI.getObject(this.ipfs, prevHead.head));
      seq = JSON.parse(headItem.Data)["seq"] + 1;
      newHead = await (ipfsAPI.patchObject(this.ipfs, item.Hash, prevHead.head))
      this.sequences[channel] = seq;
    }
    return newHead;
  }

  _send(channel, password, text, options) {
    // TODO: check options for what type to publish as (text, snippet, file, etc.)
    var post = this._publish(text);
    var message = this._createMessage(channel, password, post.Hash, HashCacheOps.Add);
    await(this.client.linkedList(channel, password).add(message.Hash));
    return message.Hash;
  }

  _remove(channel, password, target) {
    var message = this._createMessage(channel, password, target, HashCacheOps.Delete);
    await(this.client.linkedList(channel, password).add(message.Hash))
    return message.Hash;
  }

  _delete(channel, password) {
    await(this.client.linkedList(channel, password).delete())
    delete this.sequences[channel];
    return true;
  }

  _setMode(channel, password, modes) {
    var m = []
    if(typeof modes !== 'Array')
      m.push(modes);
    else
      m = modes;
    var res = await(this.client.linkedList(channel, password).setMode(m));
    return res.modes;
  }

  _info(channel, password) {
    return await(this.client.linkedList(channel, password).head())
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
      var ipfsd = await(ipfsDaemon());
      ipfs = ipfsd.daemon;
    }

    var client = new OrbitClient(ipfs);
    await(client._connect(host, username, password))
    return client;
  }
}

module.exports = OrbitClientFactory;
