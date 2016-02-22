'use strict';

const _    = require('lodash');
const Node = require('./Node');

class List {
  constructor(id) {
    this.id = id;
    this.seq = 0;
    this.ver = 0;
    this._items = [];
    this._currentBatch = [];
  }

  get items() {
    return this._items.concat(this._currentBatch);
  }

  add(data) {
    const heads = this._findHeads(this.items);
    const node  = new Node(this.id, this.seq, this.ver, data, heads);
    this._currentBatch.push(node);
    this.ver ++;
  }

  join(other) {
    this.seq = (other.seq && other.seq > this.seq ? other.seq : this.seq) + 1;
    this.ver = 0;
    const current = _.differenceWith(this._currentBatch, this._items, this._equals);
    const others  = _.differenceWith(other.items, this._items, this._equals);
    const final   = _.unionWith(current, others, this._equals);
    this._items   = this._items.concat(final);
    this._currentBatch = [];
  }

  _findHeads(list) {
    const grouped = _.groupBy(list, 'id');
    const heads   = Object.keys(grouped).map((g) => _.last(grouped[g]));
    const cleaned = heads.filter((e) => !this._isReferencedInChain(list, e));
    return cleaned;
  }

  _isReferencedInChain(all, item) {
    let isReferenced = _.findLast(all, (e) => this._references(e, item)) !== undefined;
    return isReferenced;
  }

  _equals(a, b) {
    return a.id == b.id && a.seq == b.seq && a.ver == b.ver;
  }

  _references(a, b) {
    for(let i = 0; i < a.next.length; i ++) {
      if(b.compactId === a.next[i])
        return true;
    }
    return false;
  }

  static fromJson(json) {
    let list = new List(json.id);
    list.seq = json.seq;
    list.ver = json.ver;
    list._items = _.uniqWith(json.items.map((f) => new Node(f.id, f.seq, f.ver, f.data, f.next)), _.isEqual);
    return list;
  }

  toJson() {
    return {
      id: this.id,
      seq: this.seq,
      ver: this.ver,
      items: this._currentBatch.map((f) => f.compact())
    }
  }

  toString() {
    const items = this.items.map((f) => JSON.stringify(f.compact())).join("\n");
    return `id: ${this.id}, seq: ${this.seq}, ver: ${this.ver}, items:\n${items}`;
  }
}

module.exports = List;
