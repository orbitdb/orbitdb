'use strict';

const async       = require('asyncawait/async');
const await       = require('asyncawait/await');
const ipfsAPI     = require('orbit-common/lib/ipfs-api-promised');
const OrbitDBItem = require('../post/OrbitDBItem');
const Post        = require('../post/Post');

class Operation {
  static create(ipfs, log, user, operation, key, value, data) {
    var createAsync = async(() => {
      return new Promise(async((resolve, reject) => {
        const hash = await(Operation._createOperation(ipfs, user, operation, key, value));
        await(log.add(hash));
        const listHash = await(log.ipfsHash);
        resolve(listHash);
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
}

module.exports = Operation;
