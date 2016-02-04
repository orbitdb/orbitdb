'use strict';

var async         = require('asyncawait/async');
var await         = require('asyncawait/await');
var ipfsAPI       = require('orbit-common/lib/ipfs-api-promised');
var Keystore      = require('orbit-common/lib/Keystore');
var Encryption    = require('orbit-common/lib/Encryption');
var HashCache     = require('./HashCacheClient');
var HashCacheItem = require('./HashCacheItem').EncryptedHashCacheItem;
var HashCacheOps  = require('./HashCacheOps');
var MemoryCache   = require('./MemoryCache');

const pubkey  = Keystore.getKeys().publicKey;
const privkey = Keystore.getKeys().privateKey;

const DefaultAmount = 1;

class Aggregator {
  static fetchRecursive(ipfs, hash, password, options, currentAmount, deleted) {
    const opts = {
      amount: options.amount ? options.amount : DefaultAmount,
      last:   options.last ? options.last : null,
      key:    options.key ? options.key : null
    };

    let result = [];
    let handledItems = deleted ? deleted : [];

    if(!currentAmount) currentAmount = 0;

    const item = await (this._fetchOne(ipfs, hash, password));

    if(item) {
      if((item.op === HashCacheOps.Put || item.op === HashCacheOps.Add) && !this._contains(handledItems, item.key)) {
        if(!opts.key || (opts.key && opts.key === item.key)) {
          result.push({ hash: hash, item: item });
          currentAmount ++;
          handledItems.push(item.target);
        }
      } else if(item.op === HashCacheOps.Delete) {
        handledItems.push(item.target);
      }

      if(opts.key && item.key === opts.key)
        return result;

      if(opts.last && hash === opts.last)
        return result;

      if(!opts.last && opts.amount > -1 && currentAmount >= opts.amount)
        return result;

      if(item.next) {
        const items = this.fetchRecursive(ipfs, item.next, password, opts, currentAmount, handledItems);
        result = result.concat(items);
      }
    }

    return result;
  }

  static _fetchOne(ipfs, hash, password) {
    // 1. Try fetching from memory
    let data = MemoryCache.get(hash);
    // TODO: 2. Try fetching from local cache

    // 3. Fetch from network
    if(!data)
      data = await (ipfsAPI.getObject(ipfs, hash));

    // Cache the fetched item (encrypted)
    MemoryCache.put(hash, data);

    // Decrypt the item
    let item = HashCacheItem.fromEncrypted(data, pubkey, privkey, password);

    // TODO: add possibility to fetch content separately
    // fetch and decrypt content
    if(item.op === HashCacheOps.Add || item.op === HashCacheOps.Put) {
      let payload = MemoryCache.get(item.target);
      if(!payload)
        payload = await (ipfsAPI.getObject(ipfs, item.target));

      MemoryCache.put(item.target, payload);

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
