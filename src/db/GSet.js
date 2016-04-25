'use strict';

const isEqual = require('./utils').isEqual;

class GSet {
  constructor(id, payload) {
    this.id = id;
    this._added = {};
    this._removed = {};
  }

  add(data, ts) {
    this._added[data] = { ts: ts || new Date().getTime() }
  }

  remove(data, ts) {
    this._removed[data] = { ts: ts || new Date().getTime() }
  }

  get value() {
    // console.log("AAA", this._added, this._removed)
    return Object.keys(this._added).map((f) => {
      const removed = this._removed[f];
      // console.log("--", removed, this._added[f]);
      if(!removed || (removed && removed.ts < this._added[f].ts)) {
        return f;
      }

      return null;
    }).filter((f) => f !== null)
    .map((f) => {
      console.log("f", f)
      return f;
    });
  }

  compare(other) {
    return false;
    // if(other.id !== this.id)
    //   return false;

    // return isEqual(other._counters, this._counters);
  }

  merge(other) {
    // Object.keys(other._counters).forEach((f) => {
    //   this._counters[f] = Math.max(this._counters[f] ? this._counters[f] : 0, other._counters[f]);
    // });
  }

  static from(payload) {
    return new GSet(payload.id, payload.items);
  }

}

module.exports = GSet;
