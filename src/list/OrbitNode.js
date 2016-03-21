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
        this._ipfs.object.get(this.data)
          .then((payload) => {
            this.Payload = JSON.parse(payload.Data);
            let res = this.Payload;
            Object.assign(res, { hash: this.data });
            if(this.Payload.key === null)
              Object.assign(res, { key: this.data });
            resolve(res);
          })
          .catch(reject);
      } else {
        resolve(this.Payload);
      }
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
    let items = this.next.map((f) => f.hash);
    Object.assign(res, { next: items });
    return res;
  }

  static fromIpfsHash(ipfs, hash) {
    return new Promise(async((resolve, reject) => {
      ipfs.object.get(hash)
        .then((obj) => {
          const f = JSON.parse(obj.Data)
          const node = new OrbitNode(ipfs, f.id, f.data, f.next, hash)
          resolve(node);
        }).catch(reject);
    }));
  }

  static equals(a, b) {
    return a.hash === b.hash;
  }
}

module.exports = OrbitNode;
