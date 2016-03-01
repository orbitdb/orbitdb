'use strict';

const async   = require('asyncawait/async');
const await   = require('asyncawait/await');
const ipfsAPI = require('orbit-common/lib/ipfs-api-promised');
const Node    = require('./Node');

class OrbitNode extends Node {
  constructor(ipfs, id, seq, ver, data, next, hash) {
    super(id, seq, ver, data);
    this.hash = null;
    this._ipfs = ipfs;
    this.next = next || [];
    this.hash = hash ? hash : this.ipfsHash;
  }

  get ipfsHash() {
    this._commit();
    return this.hash;
  }

  compact() {
    let res = { id: this.id, seq: this.seq, ver: this.ver, data: this.data }
    let items = {};
    this.next.forEach((f) => Object.defineProperty(items, f.compactId.toString(), { value: f.ipfsHash, enumerable: true }));
    Object.assign(res, { next: items });
    return res;
  }

  fetchPayload() {
    return new Promise(async((resolve, reject) => {
      await(this._getPayload());
      resolve({ hash: this.data, payload: this.Payload });
    }));
  }

  _getPayload() {
    if(!this.Payload) {
      const payload = await(ipfsAPI.getObject(this._ipfs, this.data));
      this.Payload = JSON.parse(payload.Data);
      if(this.Payload.value) {
        const value = await(ipfsAPI.getObject(this._ipfs, this.Payload.value));
        this.Payload.value = JSON.parse(value.Data)["content"];
      }
    }
    return this.hash;
  }

  _commit() {
    if(!this.hash) {
      const r = await(ipfsAPI.putObject(this._ipfs, JSON.stringify(this.compact())));
      this.hash = r.Hash;
    }
  }

  static fromIpfsHash(ipfs, hash) {
    const createNode = async(() => {
      return new Promise(async((resolve, reject) => {
        const o = await(ipfsAPI.getObject(ipfs, hash));
        const f = JSON.parse(o.Data)
        const node = new OrbitNode(ipfs, f.id, f.seq, f.ver, f.data, f.next, hash)
        resolve(node);
      }));
    });
    return await(createNode());
  }

  static hasChild(a, b) {
    for(let i = 0; i < a.next.length; i ++) {
      if(typeof a.next[i] instanceof OrbitNode && b.compactId === a.next[i].compactId)
        return true;

      if(b.compactId === a.next[i])
        return true;
    }
    return false;
  }
}

module.exports = OrbitNode;
