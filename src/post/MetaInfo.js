'use strict';

class MetaInfo {
  constructor(type, size, ts, from) {
    this.type = type;
    this.size = size;
    this.ts = ts;
    this.from = from || '';
  }
}

module.exports = MetaInfo;
