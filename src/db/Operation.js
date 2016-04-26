'use strict';

const OpTypes     = require('./OpTypes');
const OrbitDBItem = require('../post/OrbitDBItem');
const Post        = require('../post/Post');

class Operation {
  static create(ipfs, operation, key, value) {
    const data = {
      operation: operation,
      key: key,
      value: value
    };
    return Post.create(ipfs, Post.Types.OrbitDBItem, data);
  }

  static get Types() {
    return OpTypes;
  }
}

module.exports = Operation;
