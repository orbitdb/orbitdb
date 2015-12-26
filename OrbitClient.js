'use strict';

var async         = require('asyncawait/async');
var await         = require('asyncawait/await');
var ipfsDaemon    = require('./ipfs-daemon');
var ipfsAPI       = require('./ipfs-api-promised');
var HashCache     = require('./HashCacheClient');
var HashCacheItem = require('./HashCacheItem').EncryptedHashCacheItem;
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
  }

  channel(hash, password) {
    return {
      iterator: (options) => this._iterator(hash, password, options),
      send: (text, options) => {
        this.sequences[hash] = !this.sequences[hash] ? this._getChannelSequence(hash, password) : this.sequences[hash] + 1;
        return this._send(hash, password, text, options);
      },
      delete: () => this._delete(hash, password),
      setMode: (mode) => this._setMode(hash, modes)
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

  _iterator(channel, password, options) {
    var currentIndex  = 0;
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
      messages = this._fetchRecursive(startFromHash, password, limit, gte ? gte : gt, 0);

      // Slice the array
      var startIndex = 0;
      var endIndex   = messages.length;
      if(limit > -1) {
        startIndex = Math.max(messages.length - limit, 0);
        endIndex   = messages.length - ((gt || lt) ? 1 : 0);
      } else if(limit === -1) {
        endIndex = messages.length - (gt ? 1 : 0);
      }

      messages = messages.slice(startIndex, endIndex)
    }

    if(reverse) messages.reverse();

    // Iterator interface implementation
    let iterator = {
      [Symbol.iterator]() {
        return this;
      },
      next: () => {
        var item = { value: messages[currentIndex], done: false };
        if(currentIndex < messages.length)
          currentIndex ++;
        else
          item = { value: null, done: true };
        return item;
      },
      collect: () => {
        return messages;
      }
    }

    return iterator;
  }

  _fetchOne(hash, password) {
    var item = null;
    if(hash) {
      item = await (ipfsAPI.getObject(this.ipfs, hash));
      var data = JSON.parse(item.Data);

      // verify
      var verified = Encryption.verify(data.target, data.pubkey, data.sig, data.seq, password);
      if(!verified) throw "Item '" + hash + "' has the wrong signature"

      // decrypt
      var targetDec = Encryption.decrypt(data.target, privkey, 'TODO: pubkey');
      var metaDec   = Encryption.decrypt(data.meta, privkey, 'TODO: pubkey');
      data.target   = targetDec;
      data.meta     = JSON.parse(metaDec);
      item.Data     = data;
    }
    return item;
  }

  _fetchRecursive(hash, password, amount, last, currentDepth) {
    var res = [];

    if(!last && amount > -1 && currentDepth >= amount)
      return res;

    var message = await (this._fetchOne(hash, password));
    res.push({ hash: hash, item: message });

    currentDepth ++;

    if((last && hash === last))
      return res;

    if(message && message.Links[0]) {
      var next = this._fetchRecursive(message.Links[0].Hash, password, amount, last, currentDepth);
      res = res.concat(next);
    }

    return res;
  }

  _publish(text) {
    var post = new Post(text);
    post.encrypt(privkey, pubkey);
    return await (ipfsAPI.putObject(this.ipfs, JSON.stringify(post)));
  }

  _createMessage(channel, password, post) {
    var seq  = this.sequences[channel];
    var size = -1;
    var metaInfo = new MetaInfo(ItemTypes.Message, size, new Date().getTime());
    var hcItem   = new HashCacheItem(seq, post.Hash, metaInfo, pubkey, privkey, password);
    var item     = await (ipfsAPI.putObject(this.ipfs, JSON.stringify(hcItem)));
    var newHead  = { Hash: item.Hash };

    if(seq > 0) {
      var iter     = this._iterator(channel, password);
      var prevHead = iter.next().value;
      var headItem = await (ipfsAPI.getObject(this.ipfs, prevHead.hash));
      seq = JSON.parse(headItem.Data)["seq"] + 1;
      newHead = await (ipfsAPI.patchObject(this.ipfs, item.Hash, prevHead.hash))
    }

    return newHead;
  }

  _send(channel, password, text, options) {
    // TODO: check options for what type to publish as (text, snippet, file, etc.)
    var post = this._publish(text);
    var message = this._createMessage(channel, password, post);
    await(this.client.linkedList(channel, password).add(message.Hash))
    return message.Hash;
  }

  _delete(channel, password) {
    await(this.client.linkedList(channel, password).delete())
    delete this.sequences[channel];
    return true;
  }

  _setMode(channel, modes) {
    /* TODO */
  }

  _connect(host, username, password) {
    this.client = await(HashCache.connect(host, username, password));
    return;
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
