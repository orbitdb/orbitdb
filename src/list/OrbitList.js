'use strict';

const _         = require('lodash');
const Lazy      = require('lazy.js');
const async     = require('asyncawait/async');
const await     = require('asyncawait/await');
const OrbitNode = require('./OrbitNode');

const MaxBatchSize = 10;  // How many items per sequence. Saves a snapshot to ipfs in batches of this many items.
const MaxHistory   = 256; // How many items to fetch in the chain per join

class OrbitList {
  constructor(ipfs, id, seq, ver, items) {
    this.id = id;
    this._ipfs = ipfs;
    this._items = items || [];
    this._currentBatch = [];
  }

  add(data) {
    if(this._currentBatch.length >= MaxBatchSize)
      this._commit();

    const heads = OrbitList.findHeads(this.items);
    const node  = new OrbitNode(this._ipfs, this.id, data, heads);
    this._currentBatch.push(node);
  }

  join(other) {
    const current = _.differenceWith(this._currentBatch, this._items, OrbitNode.equals);
    const others  = _.differenceWith(other.items, this._items, OrbitNode.equals);
    const final   = _.unionWith(current, others, OrbitNode.equals);
    this._items   = Lazy(this._items).concat(final).toArray();
    this._currentBatch = [];
    const history = _.flatten(await(this._fetchHistory(other.items)));
    history.forEach((f) => this._insert(f)) // Insert to the list
  }

  clear() {
    this._items = [];
    this._currentBatch = [];
  }

  /* Private methods */
  _fetchHistory(items) {
    var _fetchAsync = async(() => {
      return new Promise(async((resolve, reject) => {
        let allHashes = this._items.map((a) => a.hash);
        const handle = Lazy(items)
          .reverse() // Start from the latest item
          .map((f) => f.next).flatten() // Go through all heads
          .filter((f) => !(f instanceof OrbitNode === true)) // OrbitNode vs. {}, filter out instances (we already have them in mem)
          .async() // Do the next map asynchronously
          .map(async((f) => _.flatten(await(this._fetchRecursive(f, allHashes, MaxHistory, 0))))) // IO - fetch items recursively
          .take(MaxHistory) // How many items from the history we should fetch
          .toArray();
        // console.log("--> Fetched", res.length, "items from the history");

        handle.onComplete(resolve);
      }));
    })
    return await(_fetchAsync());
  }

  // Fetch items in the linked list recursively
  _fetchRecursive(hash, all, amount, depth) {
    var _fetchAsync = async(() => {
      return new Promise(async((resolve, reject) => {
        const isReferenced = (list, item) => Lazy(list).reverse().find((f) => f === item) !== undefined;
        let result = [];

        if(depth >= amount) {
          resolve(result)
          return;
        }

        if(isReferenced(all, hash)) {
          resolve(result);
          return;
        }

        const item = await(OrbitNode.fromIpfsHash(this._ipfs, hash)); // IO - get from IPFS
        result.push(item);
        all.push(hash);
        depth ++;

        const handle = Lazy(item.next)
          .async()
          .map(async((f) => _.flatten(await(this._fetchRecursive(f, all, amount, depth)))))
          .toArray()

        handle.onComplete((res) => {
          result = result.concat(res);
          resolve(result);
        });
      }));
    })
    return await(_fetchAsync());
  }

  // Insert to the list right after the latest parent
  _insert(item) {
    let indices = Lazy(item.next).map((next) => Lazy(this._items).map((f) => f.hash).indexOf(next)) // Find the item's parent's indices
    const index = indices.length > 0 ? Math.max(indices.max() + 1, 0) : 0; // find the largest index (latest parent)
    this._items.splice(index, 0, item);
    return item;
  }

  _commit() {
    const current = Lazy(this._currentBatch).difference(this._items).toArray();
    this._items   = this._items.concat(current);
    this._currentBatch = [];
  }

  /* Properties */
  get items() {
    return this._items.concat(this._currentBatch);
  }

  get ipfsHash() {
    const toIpfs = async(() => {
      return new Promise(async((resolve, reject) => {
        var data = await(this.asJson)
        const list = await(this._ipfs.object.put(new Buffer(JSON.stringify({ Data: JSON.stringify(data) }))));
        resolve(list.Hash);
      }));
    });
    this.hash = await(toIpfs());
    return this.hash;
  }

  get asJson() {
    return {
      id: this.id,
      items: this._currentBatch.map((f) => await(f.ipfsHash))
    }
  }

  static findHeads(list) {
    return Lazy(list)
      .reverse()
      .indexBy((f) => f.id)
      .pairs()
      .map((f) => f[1])
      .filter((f) => !OrbitList.isReferencedInChain(list, f))
      .toArray();
  }

  static isReferencedInChain(all, item) {
    return Lazy(all).reverse().find((e) => e.hasChild(item)) !== undefined;
  }

  static fromIpfsHash(ipfs, hash) {
    const fromIpfs = async(() => {
      return new Promise(async((resolve, reject) => {
        const l = await(ipfs.object.get(hash));
        const list = OrbitList.fromJson(ipfs, JSON.parse(l.Data));
        resolve(list);
      }));
    });
    return await(fromIpfs());
  }

  static fromJson(ipfs, json) {
    const items = json.items.map((f) => await(OrbitNode.fromIpfsHash(ipfs, f)));
    return new OrbitList(ipfs, json.id, -1, -1, items);
  }

  static get batchSize() {
    return MaxBatchSize;
  }

  static get maxHistory() {
    return MaxHistory;
  }
}

module.exports = OrbitList;
