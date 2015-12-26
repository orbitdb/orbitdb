'use strict';

var encryption = require('./Encryption');

class MetaInfo {
  constructor(type, size, ts) {
    this.type = type;
    this.size = size;
    this.ts   =   ts;
  }
}

module.exports = MetaInfo;
