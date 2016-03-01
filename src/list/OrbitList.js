'use strict';

const _        = require('lodash');
const async    = require('asyncawait/async');
const await    = require('asyncawait/await');
const ipfsAPI  = require('orbit-common/lib/ipfs-api-promised');
const List     = require('./List');
const Node     = require('./OrbitNode');

const MaxBatchSize = 10; // How many items per sequence. Saves a snapshot to ipfs in batches of this many items.
const MaxHistory   = 32; // How many items to fetch in the chain per join

class OrbitList extends List {
  constructor(id, ipfs) {
    super(id);
    this._ipfs = ipfs;
    this.hash = null;
    this.next = null;
  }

  add(data) {
    if(this.ver >= MaxBatchSize)
      this._commit();

    const heads = super._findHeads(this.items);
    const node  = new Node(this._ipfs, this.id, this.seq, this.ver, data, heads);
    node._commit(); // TODO: obsolete?
    this._currentBatch.push(node);
    this.ver ++;
  }

  join(other) {
    super.join(other);

    // WIP: fetch missing nodes
    let fetchedCount = 0;
    // let depth = 0;
    const isReferenced = (all, item) => _.findLast(all, (f) => f === item) !== undefined;
    const fetchRecursive = (all, hash, amount, depth) => {
      hash = hash instanceof Node === true ? hash.hash : hash;
      if(!isReferenced(all, hash)) {
        all.push(hash);
        const item = Node.fromIpfsHash(this._ipfs, hash);
        console.log("-", item.compactId, depth, amount, item.heads.length, fetchedCount)
        if(!item.next || fetchedCount > amount)
          return;

        // if(item.next && fetchedCount < amount) {
          depth ++;
          item.heads.forEach((e) => {
            // console.log("--", e)
            fetchRecursive(all, e, amount - 1, depth);
            // fetchRecursive(all, e, Math.ceil((amount - 1) / item.heads.length), depth);
            // // const indices = item.heads.map((k) => _.findIndex(this._items, (b) => b.hash === k));
            // const indices = _.findIndex(this._items, (b) => b.hash === e);
            // const idx = indices.length > 0 ? Math.max(_.max(indices) + 1, 0) : -1;
            // this._items.splice(idx, 0, item)
            // console.log("added", item.compactId, "at", idx, item.data, depth);
            // fetchedCount ++;
          });
          const indices = item.heads.map((k) => _.findIndex(this._items, (b) => b.hash === k));
          // const indices = _.findIndex(this._items, (b) => b.hash === e);
          const idx = indices.length > 0 ? Math.max(_.max(indices) + 1, 0) : -1;
          this._items.splice(idx, 0, item)
          console.log("added", item.compactId, "at", idx, item.data, depth);
        // }
        fetchedCount ++;
      } else {
        console.log("was referenced", hash)
      }
    };

    // const fetchRecursive2 = (hash, amount, currentAmount, all) => {
    //   let res = [];
    //   hash = hash instanceof Node === true ? hash.hash : hash;

    //   if(currentAmount >= amount)
    //     return res;

    //   if(!isReferenced(all, hash)) {
    //     currentAmount ++;
    //     all.push(hash);
    //     const item = Node.fromIpfsHash(this._ipfs, hash);
    //     console.log("-", item.compactId, item.heads.length, amount, currentAmount);
    //     res = _.flatten(item.heads.map((head) => {
    //       return fetchRecursive2(head, amount, currentAmount, all);
    //     }));
    //     res.push(item);
    //     console.log("res", res.length);
    //   }
    //   return _.flatten(res);
    // };
    const fetchRecursive2 = (hash, amount, all, res) => {
      // console.log("--> fetch", amount)
      let result = res ? res : [];
      hash = hash instanceof Node === true ? hash.hash : hash;

      if(res.length >= amount) {
        // console.log("------------------- exit", res.length, amount)
        return res;
      }

      if(!isReferenced(all, hash)) {
        all.push(hash);
        const item = Node.fromIpfsHash(this._ipfs, hash);
        // console.log("-", item.compactId, item.heads.length, amount, res.length);
        res.push(item);
        // console.log("res", res.length);
        item.heads.map((head) => fetchRecursive2(head, amount - 1, all, res));
        // res = _.flatten(item.heads.map((head) => fetchRecursive2(head, amount, all, res)));

        // res = _.flatten(item.heads.map((head) => {
        //   return fetchRecursive2(head, amount, currentAmount, all);
        // }));
        // res.push(item);
        // console.log("res2", res.length);
      }
      return res;
    };

    let allHashes = this._items.map((a) => a.hash);
    // let d = 0;
    // console.log("--> items:", other.items.length)
    const res = _.flatten(other.items.map((e) => _.flatten(e.heads.map((f) => {
      // console.log("--> heads:", e.heads.length)
      // console.log(">", f, d)
      // fetchRecursive(allHashes, f, Math.ceil(MaxHistory / e.heads.length), d);
      // return _.flatten(fetchRecursive2(f, Math.ceil((MaxHistory - other.items.length - e.heads.length) / e.heads.length) + (e.heads.length % 2 === 0 ? 0 : 1), allHashes, []));
      const remaining = (MaxHistory);
      // return _.flatten(fetchRecursive2(f, Math.floor(remaining / e.heads.length) + (remaining%2 === 0 ? 0 : 1), allHashes, []));
      return _.flatten(fetchRecursive2(f, MaxHistory, allHashes, []));
    }))));

    // console.log("RES", res)
    res.slice(0, MaxHistory).forEach((item) => {
      // console.log("ii", item.id)
      const indices = item.heads.map((k) => _.findIndex(this._items, (b) => b.hash === k));
      // const indices = _.findIndex(this._items, (b) => b.hash === e);
      const idx = indices.length > 0 ? Math.max(_.max(indices) + 1, 0) : 0;
      this._items.splice(idx, 0, item)
      // this._items.splice(this._items.length - 1, 0, item)
      // console.log("added", item.compactId, "at", idx, item.data);
    });

    // console.log(`--> Fetched ${res.length} items`);
    // console.log("--> Fetched", MaxHistory, "items from the history\n");
  }

  clear() {
    this._items = [];
    this._currentBatch = [];
  }

  getIpfsHash() {
    return new Promise(async((resolve, reject) => {
      var data = await(this.toJson())
      const list = await(ipfsAPI.putObject(this._ipfs, JSON.stringify(data)));
      resolve(list.Hash);
    }));
  }

  static fromIpfsHash(ipfs, hash) {
    return new Promise(async((resolve, reject) => {
      const l = await(ipfsAPI.getObject(ipfs, hash));
      const list = OrbitList.fromJson(ipfs, JSON.parse(l.Data));
      resolve(list);
    }));
  }

  toJson() {
    let items = {};
    this._currentBatch.forEach((f) => Object.defineProperty(items, f.compactId.toString(), { value: f.ipfsHash, enumerable: true }));
    return {
      id: this.id,
      seq: this.seq,
      ver: this.ver,
      items: items
    }
  }

  static fromJson(ipfs, json) {
    const items = Object.keys(json.items).map((f) => {
      const hash = json.items[f];
      return Node.fromIpfsHash(ipfs, hash);
    });
    return new List(json.id, json.seq, json.ver, items);
  }

  static get batchSize() {
    return MaxBatchSize;
  }

  _isReferencedInChain(all, item) {
    const isReferenced = _.findLast(all, (e) => Node.hasChild(e, item)) !== undefined;
    return isReferenced;
  }

  _commit() {
    const current = _.differenceWith(this._currentBatch, this._items, this._equals);
    this._items   = this._items.concat(current);
    this._currentBatch = [];
    this.ver = 0;
    this.seq ++;
  }
}

module.exports = OrbitList;
