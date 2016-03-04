'use strict';

const _          = require('lodash');
const Lazy       = require('lazy.js');
const async      = require('asyncawait/async');
const await      = require('asyncawait/await');
const ipfsAPI    = require('orbit-common/lib/ipfs-api-promised');
const List       = require('./List');
const Node       = require('./OrbitNode');
const Operations = require('./Operations');

const MaxBatchSize = 10;   // How many items per sequence. Saves a snapshot to ipfs in batches of this many items.
const MaxHistory   = 1000; // How many items to fetch in the chain per join

// class IPFSLWWSet extends LWWSet {
class OrbitList extends List {
  constructor(ipfs, id, seq, ver, items) {
    super(id, seq, ver, items);
    this._ipfs = ipfs;
  }

  add(data) {
    if(this.ver >= MaxBatchSize)
      this._commit();

    const heads = List.findHeads(this.items);
    const node  = new Node(this._ipfs, this.id, this.seq, this.ver, data, heads);
    this._currentBatch.push(node);
    this.ver ++;
  }

  join(other) {
    super.join(other);
    this._fetchHistory(other.items);
  }

  // The LWW-set query interface
  find(opts) {
    let list     = Lazy(this.items);
    const hash   = (opts.gt ? opts.gt : (opts.gte ? opts.gte : (opts.lt ? opts.lt : opts.lte)));
    const amount = opts.amount ? (opts.amount && opts.amount > -1 ? opts.amount : this.items.length) : 1;

    // Last-Write-Wins set
    let handled = [];
    const _createLWWSet = (f) => {
      const wasHandled = Lazy(handled).indexOf(f.payload.key) > -1;
      if(!wasHandled) handled.push(f.payload.key);
      if(Operations.isUpdate(f.payload.op) && !wasHandled) return f;
      return null;
    };

    // Find an item from the lazy sequence (list)
    const _findFrom = (sequence, key, amount, inclusive) => {
      return sequence
        .map((f) => await(f.fetchPayload())) // IO - fetch the actual OP from ipfs. consider merging with LL.
        .skipWhile((f) => key && f.payload.key !== key) // Drop elements until we have the first one requested
        .drop(!inclusive ? 1 : 0) // Drop the 'gt/lt' item, include 'gte/lte' item
        .map(_createLWWSet) // Return items as LWW (ignore values after the first found)
        .filter((f) => f !== null) // Make sure we don't have empty ones
        .take(amount)
    };

    // Key-Value
    if(opts.key)
      return _findFrom(list.reverse(), opts.key, 1, true).toArray();

    // Greater than case
    if(opts.gt || opts.gte)
      return _findFrom(list, hash, amount, opts.gte || opts.lte).toArray();

    // Lower than and lastN case, search latest first by reversing the sequence
    return _findFrom(list.reverse(), hash, amount, opts.lte || !opts.lt).reverse().toArray();
  }

  /* Private methods */
  _fetchHistory(items) {
    let allHashes = this._items.map((a) => a.hash);
    const res = Lazy(items)
      .reverse() // Start from the latest item
      .map((f) => f.heads).flatten() // Go through all heads
      .filter((f) => !(f instanceof Node === true)) // OrbitNode vs. {}, filter out instances (we already have them in mem)
      .map((f) => this._fetchRecursive(f, allHashes)).flatten() // IO - get the data from IPFS
      .map((f) => this._insert(f)) // Insert to the list
      .take(MaxHistory) // How many items from the history we should fetch
      .toArray();
    // console.log("--> Fetched", res.length, "items from the history\n");
  }

  _fetchRecursive(hash, all) {
    const isReferenced = (list, item) => Lazy(list).find((f) => f === item) !== undefined;
    let result = [];
    if(!isReferenced(all, hash)) {
      all.push(hash);
      const item = await(Node.fromIpfsHash(this._ipfs, hash)); // IO - get from IPFS
      result.push(item);
      result = result.concat(Lazy(item.heads)
        .map((f) => this._fetchRecursive(f, all))
        .flatten()
        .toArray());
    }
    return result;
  }

  // Insert to the list right after the latest parent
  _insert(item) {
    const index = Lazy(item.heads)
      .map((next) => Lazy(this._items).map((f) => f.hash).indexOf(next)) // Find the item's parent's indices
      .reduce((max, a) => a > max ? a : max, 0); // find the largest index (latest parent)

    this._items.splice(index, 0, item);
  }

  /* Properties */
  get ipfsHash() {
    const toIpfs = async(() => {
      return new Promise(async((resolve, reject) => {
        var data = await(this.asJson)
        const list = await(ipfsAPI.putObject(this._ipfs, JSON.stringify(data)));
        resolve(list.Hash);
      }));
    });
    this.hash = await(toIpfs());
    return this.hash;
  }

  get asJson() {
    let items = {};
    this._currentBatch.forEach((f) => Object.defineProperty(items, f.compactId.toString(), { value: f.ipfsHash, enumerable: true }));
    return {
      id: this.id,
      seq: this.seq,
      ver: this.ver,
      items: items
    }
  }

  static fromIpfsHash(ipfs, hash) {
    const fromIpfs = async(() => {
      return new Promise(async((resolve, reject) => {
        const l = await(ipfsAPI.getObject(ipfs, hash));
        const list = OrbitList.fromJson(ipfs, JSON.parse(l.Data));
        resolve(list);
      }));
    });
    return await(fromIpfs());
  }

  static fromJson(ipfs, json) {
    const items = Object.keys(json.items).map((f) => Node.fromIpfsHash(ipfs, json.items[f]));
    return new OrbitList(ipfs, json.id, json.seq, json.ver, items);
  }

  static get batchSize() {
    return MaxBatchSize;
  }
}

module.exports = OrbitList;
