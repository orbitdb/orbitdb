'use strict';

const async       = require('asyncawait/async');
const await       = require('asyncawait/await');
const OpTypes     = require('./OpTypes');
const OrbitDBItem = require('../post/OrbitDBItem');
const Post        = require('../post/Post');

class Operation {
  static create(ipfs, log, user, operation, key, value, data) {
    var createAsync = async(() => {
      return new Promise(async((resolve, reject) => {
        const hash = await(Operation._createOperation(ipfs, user, operation, key, value));
        await(log.add(hash));
        resolve(hash);
      }));
    })
    return await(createAsync());
  }

  static _createOperation(ipfs, user, operation, key, value) {
    var createOperationAsync = async(() => {
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
    })
    return await(createOperationAsync());
  }

  static get Types() {
    return OpTypes;
  }
}

module.exports = Operation;
