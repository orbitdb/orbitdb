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

  fetchPayload() {
    return new Promise(async((resolve, reject) => {
      if(!this.Payload) {
        const payload = await(ipfsAPI.getObject(this._ipfs, this.data));
        this.Payload = JSON.parse(payload.Data);
        if(this.Payload.value) {
          const value = await(ipfsAPI.getObject(this._ipfs, this.Payload.value));
          this.Payload.value = JSON.parse(value.Data);
        }
      }
      let res = this.Payload;
      Object.assign(res, { hash: this.data });
      resolve(res);
    }));
  }

  _commit() {
    if(!this.hash) {
      const r = await(ipfsAPI.putObject(this._ipfs, JSON.stringify(this.asJson)));
      this.hash = r.Hash;
    }
  }

  get ipfsHash() {
    await(this._commit());
    return this.hash;
  }

  get asJson() {
    let res = { id: this.id, seq: this.seq, ver: this.ver, data: this.data }
    let items = {};
    this.next.forEach((f) => Object.defineProperty(items, f.compactId.toString(), { value: f.ipfsHash, enumerable: true }));
    Object.assign(res, { next: items });
    return res;
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
}

module.exports = OrbitNode;
