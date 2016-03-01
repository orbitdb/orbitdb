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

    // WIP: fetch history
    const isReferenced = (all, item) => _.findLast(all, (f) => f === item) !== undefined;
    const fetchRecursive = (hash, amount, all, res) => {
      let result = res ? res : [];
      hash = hash instanceof Node === true ? hash.hash : hash;

      if(res.length >= amount)
        return res;

      if(!isReferenced(all, hash)) {
        all.push(hash);
        const item = Node.fromIpfsHash(this._ipfs, hash);
        res.push(item);
        item.heads.map((head) => fetchRecursive(head, amount - 1, all, res));
      }

      return res;
    };

    let allHashes = this._items.map((a) => a.hash);

    const res = _.flatten(other.items.map((e) => _.flatten(e.heads.map((f) => {
      const remaining = (MaxHistory);
      return _.flatten(fetchRecursive(f, MaxHistory, allHashes, []));
    }))));

    res.slice(0, MaxHistory).forEach((item) => {
      const indices = item.heads.map((k) => _.findIndex(this._items, (b) => b.hash === k));
      const idx = indices.length > 0 ? Math.max(_.max(indices) + 1, 0) : 0;
      this._items.splice(idx, 0, item)
    });

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
