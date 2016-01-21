'use strict';

var async         = require('asyncawait/async');
var await         = require('asyncawait/await');
var ipfsAPI       = require('./ipfs-api-promised');
var HashCache     = require('./HashCacheClient');
var HashCacheItem = require('./HashCacheItem').EncryptedHashCacheItem;
var HashCacheOps  = require('./HashCacheItem').HashCacheOps;
var Keystore      = require('./Keystore');
var Encryption    = require('./Encryption');

var pubkey  = Keystore.getKeys().publicKey;
var privkey = Keystore.getKeys().privateKey;

class Aggregator {
  static fetchRecursive(ipfs, hash, password, options, currentDepth, deleted) {
    const opts = {
      amount: options.amount ? options.amount : 1,
      last:   options.last ? options.last : null,
      key:    options.key ? options.key : null
    };

    let res = [];
    let handledItems = deleted ? deleted : [];

    if(!currentDepth) currentDepth = 0;

    const item = await (this._fetchOne(ipfs, hash, password));

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
        const next = this.fetchRecursive(ipfs, item.next, password, opts, currentDepth, handledItems);
        res = res.concat(next);
      }
    }

    return res;
  }

  static _fetchOne(ipfs, hash, password) {
    let data = await (ipfsAPI.getObject(ipfs, hash));
    let item = HashCacheItem.fromEncrypted(data, pubkey, privkey, password);

    // TODO: add possibility to fetch content separately
    // fetch and decrypt content
    if(item.op === HashCacheOps.Add || item.op === HashCacheOps.Put) {
      const payload    = await (ipfsAPI.getObject(ipfs, item.target));
      const contentEnc = JSON.parse(payload.Data)["content"];
      const contentDec = Encryption.decrypt(contentEnc, privkey, 'TODO: pubkey');
      item.Payload     = contentDec;
    }

    return item;
  }

  static _contains(src, e) {
    return src.filter((f) => f.toString() === e.toString()).length > 0;
  }
}

module.exports = Aggregator;
