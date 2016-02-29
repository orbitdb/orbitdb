'use strict';

const _    = require('lodash');
const Node = require('./Node');

class List {
  constructor(id, seq, ver, items) {
    this.id = id;
    this.seq = seq ? seq : 0;
    this.ver = ver ? ver : 0;
    this._items = items ? items : [];
    this._currentBatch = [];
  }

  get compactId() {
    return "" + this.id + "." + this.seq + "." + this.ver;
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
    const current = _.differenceWith(this._currentBatch, this._items, Node.equals);
    const others  = _.differenceWith(other.items, this._items, Node.equals);
    const final   = _.unionWith(current, others, Node.equals);
    // const final   = _.unionWith(others, current, Node.equals);
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
    const isReferenced = _.findLast(all, (e) => Node.hasChild(e, item)) !== undefined;
    return isReferenced;
  }

  toJson() {
    return {
      id: this.id,
      seq: this.seq,
      ver: this.ver,
      items: this._currentBatch.map((f) => f.toJson())
    }
  }

  static fromJson(json) {
    let list = new List(json.id);
    list.seq = json.seq;
    list.ver = json.ver;
    list._items = _.uniqWith(json.items.map((f) => new Node(f.id, f.seq, f.ver, f.data, f.next)), _.isEqual);
    return list;
  }
}

module.exports = List;
