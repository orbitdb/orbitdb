'use strict';

const Encryption = require('orbit-common/lib/Encryption');

class Post {
  constructor(content) {
    this.content = content;
    this.ts = new Date().getTime();
  }

  encrypt(privkey, pubkey) {
    this.content = Encryption.encrypt(this.content, privkey, pubkey);
  }
}

module.exports = Post;
