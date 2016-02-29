'use strict';

const _            = require('lodash');
const async        = require('asyncawait/async');
const await        = require('asyncawait/await');
const OrbitList    = require('./list/OrbitList');
const HashCacheOps = require('./HashCacheOps');

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

  _fetchRecursive(options, currentAmount, deleted, res) {
    const opts = {
      amount: options && options.amount ? options.amount : DefaultAmount,
      first:  options && options.first ? options.first : null,
      last:   options && options.last ? options.last : null,
      key:    options && options.key ? options.key : null
    };

    if(!currentAmount) currentAmount = 0;

    if(!opts.first && !opts.last && !opts.key && opts.amount == -1)
      return this.list.items.map((e) => e.fetchPayload()).reverse();

    let result = res ? res : [];
    let handledItems = deleted ? deleted : [];
    let item;

    // Fetch the item from ipfs
    const node = this.list.items[this.list.items.length - currentAmount - 1];
    if(node) item = await(node.fetchPayload());

    const canAdd = (firstHash, key, foundItemsCount) => {
      return (!opts.key   || (opts.key && opts.key === item.payload.key)) &&
             (!opts.first || (opts.first && (opts.first === item.payload.key && foundItemsCount === 0))
                          || (opts.first && (opts.first !== item.payload.key && foundItemsCount > 0)))
    };

    if(item && item.payload) {
      const wasHandled = _.includes(handledItems, item.payload.key); // Last Write Wins, if it was handled, ignore the rest
      if((item.payload.op === HashCacheOps.Put || item.payload.op === HashCacheOps.Add) && !wasHandled) {
        if(canAdd(opts.first, item.payload.key, result.length)) {
          result.push(item);
          handledItems.push(item.payload.key);
        }
      } else if(item.payload.op === HashCacheOps.Delete) {
        handledItems.push(item.payload.key);
      }

      currentAmount ++;

      if(opts.key && item.payload.key === opts.key)
        return result;

      if(opts.last && item.payload.key === opts.last)
        return result;

      if(!opts.last && opts.amount > -1 && result.length >= opts.amount)
        return result;

      if(currentAmount >= this.list.items.length)
        return result;

      result = this._fetchRecursive(opts, currentAmount, handledItems, result);
    }

    return result;

  }
}

module.exports = DataStore;
