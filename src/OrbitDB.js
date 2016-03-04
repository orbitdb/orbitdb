'use strict';

const EventEmitter = require('events').EventEmitter;
const async        = require('asyncawait/async');
const await        = require('asyncawait/await');
const ipfsAPI      = require('orbit-common/lib/ipfs-api-promised');
const Operations   = require('./list/Operations');
const List         = require('./list/OrbitList');
const OrbitDBItem  = require('./db/OrbitDBItem');
const ItemTypes    = require('./db/ItemTypes');
const MetaInfo     = require('./db/MetaInfo');
const Post         = require('./db/Post');

class OrbitDB {
  constructor(ipfs) {
    this._ipfs = ipfs;
    this._logs = {};
    this.events = new EventEmitter();
  }

  /* Public methods */
  use(channel, user, password) {
    this.user = user;
    this._logs[channel] = new List(this._ipfs, this.user.username);
  }

  sync(channel, hash) {
    console.log("--> Head:", hash)
    if(hash && this._logs[channel]) {
      const other = List.fromIpfsHash(this._ipfs, hash);
      this._logs[channel].join(other);
    }
  }

  /* DB Operations */
  read(channel, password, options) {
    let opts = options || {};
    Object.assign(opts, { amount: opts.limit || 1 });
    let messages = await(this._logs[channel].find(opts));
    if(opts.reverse) messages.reverse();
    return messages;
  }

  add(channel, password, data) {
    const post = await(this._publish(data));
    const key = post.Hash;
    return await(this._createOperation(channel, password, Operations.Add, key, post.Hash, data));
  }

  put(channel, password, key, data) {
    const post = await(this._publish(data));
    return await(this._createOperation(channel, password, Operations.Put, key, post.Hash));
  }

  del(channel, password, hash) {
    return await(this._createOperation(channel, password, Operations.Delete, hash, null));
  }

  deleteChannel(channel, password) {
    this._logs[channel].clear();
    return true;
  }

  /* Private methods */
  _createOperation(channel, password, operation, key, value, data) {
    var createOperation = async(() => {
      return new Promise(async((resolve, reject) => {
        const hash = this._createMessage(channel, password, operation, key, value);
        const res = await(this._logs[channel].add(hash));
        const listHash = await(this._logs[channel].ipfsHash);
        resolve(listHash);
      }));
    })
    const hash = await(createOperation());
    this.events.emit('data', hash);
    return key;
  }

  _createMessage(channel, password, operation, key, value) {
    const size = -1;
    const meta = new MetaInfo(ItemTypes.Message, size, this.user.username, new Date().getTime());
    const item = new OrbitDBItem(operation, key, value, meta);
    const data = await (ipfsAPI.putObject(this._ipfs, JSON.stringify(item)));
    return data.Hash;
  }

  _publish(data) {
    return new Promise((resolve, reject) => {
      let post = new Post(data);
      // post.encrypt(privkey, pubkey);
      const res = await (ipfsAPI.putObject(this._ipfs, JSON.stringify(post)));
      resolve(res);
    })
  }

}

module.exports = OrbitDB;
