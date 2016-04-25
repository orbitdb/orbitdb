'use strict';

const isEqual = require('./utils').isEqual;

class GSet {
  constructor(id, payload) {
    this.id = id;
    this._items = payload ? payload : [];
    // this._counters[this.id] = this._counters[this.id] ? this._counters[this.id] : 0;
  }

  add(data) {
    this._items.push(data);
  }

  // remove(data) {
  // }

  // increment(amount) {
  //   if(!amount) amount = 1;
  //   this._counters[this.id] = this._counters[this.id] + amount;
  // }

  // get value() {
  //   return Object.keys(this._counters)
  //     .map((f) => this._counters[f])
  //     .reduce((previousValue, currentValue) => previousValue + currentValue, 0);
  // }

  query() {
    return this._items;
  }

  get payload() {
    return { id: this.id, items: this._items };
  }

  // compare(other) {
  //   if(other.id !== this.id)
  //     return false;

  //   return isEqual(other._counters, this._counters);
  // }

  // merge(other) {
  //   Object.keys(other._counters).forEach((f) => {
  //     this._counters[f] = Math.max(this._counters[f] ? this._counters[f] : 0, other._counters[f]);
  //   });
  // }

  // static from(payload) {
  //   return new LWWSet(payload.id, payload.counters);
  // }

}

module.exports = GSet;
