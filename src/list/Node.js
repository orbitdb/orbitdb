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

  compact() {
    return { id: this.id, seq: this.seq, ver: this.ver, data: this.data, next: this.next }
  }
}

module.exports = Node;
