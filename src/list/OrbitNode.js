'use strict';

const async = require('asyncawait/async');
const await = require('asyncawait/await');

class OrbitNode {
  constructor(ipfs, id, data, next, hash) {
    this._ipfs = ipfs;
    this.id = id;
    this.data = data || null;
    this.next = next || [];
    this.hash = hash ? hash : this.ipfsHash;
  }

  fetchPayload() {
    return new Promise(async((resolve, reject) => {
      if(!this.Payload) {
        const payload = await(this._ipfs.object.get(this.data));
        this.Payload = JSON.parse(payload.Data);
      }
      let res = this.Payload;
      Object.assign(res, { hash: this.data });
      if(this.Payload.key === null)
        Object.assign(res, { key: this.data });
      resolve(res);
    }));
  }

  hasChild(a) {
    const id = a;
    for(let i = 0; i < this.next.length; i++) {
      if(this.next[i] === id)
        return true;
    }
    return false;
  }

  get ipfsHash() {
    if(!this.hash) {
      const r = await(this._ipfs.object.put(new Buffer(JSON.stringify({ Data: JSON.stringify(this.asJson) }))));
      this.hash = r.Hash;
    }
    return this.hash;
  }

  get asJson() {
    let res = { id: this.id, data: this.data }
    let items = this.next.map((f) => f.ipfsHash);
    Object.assign(res, { next: items });
    return res;
  }

  static fromIpfsHash(ipfs, hash) {
    const createNode = async(() => {
      return new Promise(async((resolve, reject) => {
        const o = await(ipfs.object.get(hash));
        const f = JSON.parse(o.Data)
        const node = new OrbitNode(ipfs, f.id, f.data, f.next, hash)
        resolve(node);
      }));
    });
    return await(createNode());
  }

  static equals(a, b) {
    return a.hash === b.hash;
  }
}

module.exports = OrbitNode;
