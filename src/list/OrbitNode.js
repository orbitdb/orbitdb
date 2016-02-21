'use strict';

const async   = require('asyncawait/async');
const await   = require('asyncawait/await');
const ipfsAPI = require('orbit-common/lib/ipfs-api-promised');
const Node    = require('./Node');

class OrbitNode extends Node {
  constructor(ipfs, id, seq, ver, data, next) {
    super(id, seq, ver, data, next);
    this.hash = null;
    this._ipfs = ipfs;
  }

  get compactId() {
    if(!this.hash) {
      const t = this.compact();
      const r = await(ipfsAPI.putObject(this._ipfs, JSON.stringify(t)));
      this.hash = r.Hash;
    }
    return "" + this.id + "." + this.seq + "." + this.ver + "." + this.hash;
  }

  getPayload() {
    if(!this.Payload) {
      return new Promise(async((resolve, reject) => {
        const payload = await(ipfsAPI.getObject(this._ipfs, this.data));
        this.Payload = JSON.parse(payload.Data);
        if(this.Payload.value) {
          const value = await(ipfsAPI.getObject(this._ipfs, this.Payload.value));
          this.Payload.value = JSON.parse(value.Data)["content"];
        }
        resolve(this);
      }));
    } else {
      return this;
    }
  }

  compact() {
    return { id: this.id, seq: this.seq, ver: this.ver, data: this.data, next: this.next, Payload: this.Payload }
  }
}

module.exports = OrbitNode;
