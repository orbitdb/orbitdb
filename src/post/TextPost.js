'use strict';

const Encryption = require('orbit-common/lib/Encryption');

// Simplest type of post: a string
class TextPost {
  constructor(content) {
    this.content = content;
    this.ts = new Date().getTime();
  }

  // TODO: make sure this works
  encrypt(privkey, pubkey) {
    this.content = Encryption.encrypt(this.content, privkey, pubkey);
  }
}

module.exports = TextPost;
