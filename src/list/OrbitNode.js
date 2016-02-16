'use strict';

const ipfsAPI = require('orbit-common/lib/ipfs-api-promised');
const await   = require('asyncawait/await');
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

  compact() {
    return { id: this.id, seq: this.seq, ver: this.ver, data: this.data, next: this.next }
  }
}

module.exports = OrbitNode;
