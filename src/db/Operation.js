'use strict';

const OpTypes     = require('./OpTypes');
const OrbitDBItem = require('../post/OrbitDBItem');
const Post        = require('../post/Post');

class Operation {
  static create(ipfs, log, user, operation, key, value, data) {
    return new Promise((resolve, reject) => {
      let hash;
      Operation._createOperation(ipfs, user, operation, key, value)
        .then((res) => {
          hash = res;
          return log.add(hash);
        })
        .then(() => resolve(hash))
        .catch(reject);
    });
  }

  static _createOperation(ipfs, user, operation, key, value) {
    return new Promise((resolve, reject) => {
      const data = {
        operation: operation,
        key: key,
        value: value,
        by: user.id || 'empty'
      };
      Post.create(ipfs, Post.Types.OrbitDBItem, data)
        .then((op) => resolve(op.Hash))
        .catch(reject);
    });
  }

  static get Types() {
    return OpTypes;
  }
}

module.exports = Operation;
