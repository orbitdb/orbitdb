'use strict';

class Node {
  constructor(id, seq, ver, data, next) {
    this.id = id;
    this.seq = seq;
    this.ver = ver;
    this.data = data || null;
    this.next = next ? next.map((f) => f.compactId ? f.compactId : f) : [];
  }

  get compactId() {
    return "" + this.id + "." + this.seq + "." + this.ver;
  }

  toJson() {
    return { id: this.id, seq: this.seq, ver: this.ver, data: this.data, next: this.next }
  }

  static equals(a, b) {
    return a.id == b.id && a.seq == b.seq && a.ver == b.ver;
  }

  static hasChild(a, b) {
    for(let i = 0; i < a.next.length; i ++) {
      if(b.compactId === a.next[i])
        return true;
    }
    return false;
  }
}

module.exports = Node;
