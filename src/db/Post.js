'use strict';

const async      = require('asyncawait/async');
const await      = require('asyncawait/await');
const ipfsAPI    = require('orbit-common/lib/ipfs-api-promised');
const Encryption = require('orbit-common/lib/Encryption');

class Post {
  constructor(content) {
    this.content = content;
    this.ts = new Date().getTime();
  }

  encrypt(privkey, pubkey) {
    this.content = Encryption.encrypt(this.content, privkey, pubkey);
  }

  static publish(ipfs, data) {
    return new Promise((resolve, reject) => {
      let post = new Post(data);
      const res = await (ipfsAPI.putObject(ipfs, JSON.stringify(post)));
      resolve(res);
    })
  }
}

module.exports = Post;
