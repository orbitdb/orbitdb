'use strict';

const _        = require('lodash');
const async    = require('asyncawait/async');
const await    = require('asyncawait/await');
const ipfsAPI  = require('orbit-common/lib/ipfs-api-promised');
const List     = require('./List');
const Node     = require('./OrbitNode');

const MaxBatchSize = 200;

class OrbitList extends List {
  constructor(id, ipfs) {
    super(id);
    this._ipfs = ipfs;
    this.hash = null;
  }

  add(data) {
    const heads = super._findHeads(this.items);
    const node  = new Node(this._ipfs, this.id, this.seq, this.ver, data, heads);
    this._currentBatch.push(node);
    this.ver ++;

    if(this.ver >= MaxBatchSize)
      this._commit();

    return node.ipfsHash;
  }

  clear() {
    this._items = [];
    this._currentBatch = [];
  }

  getIpfsHash() {
    const list = await(ipfsAPI.putObject(this._ipfs, JSON.stringify(this.toJson())));
    return list.Hash;
  }

  static fromIpfsHash(ipfs, hash) {
    const l = await(ipfsAPI.getObject(ipfs, hash));
    const list = OrbitList.fromJson(ipfs, JSON.parse(l.Data));
    return list;
  }

  static fromJson(ipfs, json) {
    let list = new List(json.id);
    list.seq = json.seq;
    list.ver = json.ver;
    // list._items = _.uniqWith(json.items.map((f) => new Node(ipfs, f.id, f.seq, f.ver, f.data, f.next)), _.isEqual);
    list._items = json.items.map((f) => new Node(ipfs, f.id, f.seq, f.ver, f.data, f.next));
    return list;
  }

  static get batchSize() {
    return MaxBatchSize;
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
