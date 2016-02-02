'use strict';

var encryption = require('./Encryption');

class Post {
  constructor(content) {
    this.content = content;
    this.ts = new Date().getTime();
  }

  encrypt(privkey, pubkey) {
    this.content = encryption.encrypt(this.content, privkey, pubkey);
  }
}

module.exports = Post;
