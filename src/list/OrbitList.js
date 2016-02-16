'use strict';

const _        = require('lodash');
const async    = require('asyncawait/async');
const await    = require('asyncawait/await');
const ipfsAPI  = require('orbit-common/lib/ipfs-api-promised');
const List     = require('./List');
const Node     = require('./OrbitNode');

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
  }

  getIpfsHash() {
    return new Promise(async((resolve, reject) => {
      const list = await(ipfsAPI.putObject(this._ipfs, JSON.stringify(this.toJson())));
      resolve(list.Hash);
    }));
  }

  static fromJson(ipfs, json) {
    let list = new List(json.id);
    list.seq = json.seq;
    list.ver = json.ver;
    list._items = _.uniqWith(json.items.map((f) => new Node(ipfs, f.id, f.seq, f.ver, f.data, f.next)), _.isEqual);
    return list;
  }

  static fromIpfsHash(ipfs, hash) {
    return new Promise(async((resolve, reject) => {
      const l = await(ipfsAPI.getObject(ipfs, hash));
      const list = OrbitList.fromJson(ipfs, JSON.parse(l.Data));
      resolve(list);
    }));
  }
}

module.exports = OrbitList;
