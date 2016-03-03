'use strict';

class MetaInfo {
  constructor(type, size, from, ts) {
    this.type = type;
    this.size = size;
    this.from = from;
    this.ts   =   ts;
  }
}

module.exports = MetaInfo;
