'use strict';

const _            = require('lodash');
const async        = require('asyncawait/async');
const await        = require('asyncawait/await');
const ipfsAPI      = require('orbit-common/lib/ipfs-api-promised');
const OrbitList    = require('./list/OrbitList');
const HashCacheOps = require('./HashCacheOps');

var Timer = require('../examples/Timer');

const DefaultAmount = 1;

class DataStore {
  constructor(id, ipfs) {
    this._ipfs = ipfs;
    this.list = new OrbitList(id, this._ipfs);
  }

  add(hash) {
    return this.list.add(hash);
  }

  join(other) {
    this.list.join(other);
  }

  clear() {
    this.list.clear();
  }

  get(options) {
    return this._fetchRecursive(options);
  }

  _fetchOne(index) {
    const item = this.list.items[this.list.items.length - index - 1];
    if(item) {
      await(item.getPayload());
      const f = item.compact();
      return { hash: f.data, payload: f.Payload };
    }
    return null;
  }

  _fetchRecursive(options, currentAmount, deleted, res) {
    // console.log("-->")
    // console.log("opts:", options, currentAmount)
    const opts = {
      amount: options && options.amount ? options.amount : DefaultAmount,
      first:  options && options.first ? options.first : null,
      last:   options && options.last ? options.last : null,
      key:    options && options.key ? options.key : null
    };

    let result = res ? res : [];
    let handledItems = deleted ? deleted : [];

    if(!currentAmount) currentAmount = 0;

    const item = this._fetchOne(currentAmount);
    // console.log("ITEM", item)

    if(item && item.payload) {
      const wasHandled = _.includes(handledItems, item.payload.key);
      if((item.payload.op === HashCacheOps.Put || item.payload.op === HashCacheOps.Add) && !wasHandled) {
        if((!opts.key || (opts.key && opts.key === item.payload.key)) &&
           (!opts.first || (opts.first && (opts.first === item.payload.key && result.length === 0))
                        || (opts.first && (opts.first !== item.payload.key && result.length > 0))))
        {
          // console.log("PUSH!", item, currentAmount, result.length);
          result.push(item);
          handledItems.push(item.payload.key);
        }
      } else if(item.payload.op === HashCacheOps.Delete) {
        // console.log("DELETE!", item);
        handledItems.push(item.payload.key);
      }

      currentAmount ++;

      if(opts.key && item.payload.key === opts.key)
        return result;

      // console.log("ITEM", item.payload.key, opts.last)
      if(opts.last && item.payload.key === opts.last)
        return result;

      if(!opts.last && opts.amount > -1 && result.length >= opts.amount)
        return result;

      if(currentAmount >= this.list.items.length)
        return result;

      // console.log("RES!", result)
      result = this._fetchRecursive(opts, currentAmount, handledItems, result);
    }

    return result;

  }
}

module.exports = DataStore;
