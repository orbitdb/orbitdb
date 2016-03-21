'use strict';

const async       = require('asyncawait/async');
const await       = require('asyncawait/await');
const OpTypes     = require('./OpTypes');
const OrbitDBItem = require('../post/OrbitDBItem');
const Post        = require('../post/Post');

class Operation {
  static create(ipfs, log, user, operation, key, value, data) {
    return new Promise(async((resolve, reject) => {
      const hash = await(Operation._createOperation(ipfs, user, operation, key, value));
      await(log.add(hash));
      resolve(hash);
    }));
  }

  static _createOperation(ipfs, user, operation, key, value) {
    return new Promise(async((resolve, reject) => {
      const data = {
        operation: operation,
        key: key,
        value: value,
        by: user.id || 'empty'
      };
      const op = await(Post.create(ipfs, Post.Types.OrbitDBItem, data));
      resolve(op.Hash);
    }));
  }

  static get Types() {
    return OpTypes;
  }
}

module.exports = Operation;
