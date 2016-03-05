'use strict';

const async       = require('asyncawait/async');
const await       = require('asyncawait/await');
const ipfsAPI     = require('orbit-common/lib/ipfs-api-promised');
const OrbitDBItem = require('./OrbitDBItem');
const ItemTypes   = require('./ItemTypes');
const MetaInfo    = require('./MetaInfo');

class Operation {
  static create(ipfs, log, user, operation, key, value, data) {
    var createOperation = async(() => {
      return new Promise(async((resolve, reject) => {
        const hash = await(Operation._createOperation(ipfs, user, operation, key, value));
        await(log.add(hash));
        const listHash = await(log.ipfsHash);
        resolve(listHash);
      }));
    })
    return await(createOperation());
  }

  static _createOperation(ipfs, user, operation, key, value) {
    const size = -1;
    const meta = new MetaInfo(ItemTypes.Message, size, user.username, new Date().getTime());
    const item = new OrbitDBItem(operation, key, value, meta);
    const data = await (ipfsAPI.putObject(ipfs, JSON.stringify(item)));
    return data.Hash;
  }
}

module.exports = Operation;
