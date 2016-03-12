'use strict';

const Post = require('./BasePost');
const Encryption = require('orbit-common/lib/Encryption');

// Simplest type of post: a string
class TextPost extends Post {
  constructor(content) {
    super("text");
    this.content = content;
  }

  // TODO: make sure this works
  encrypt(privkey, pubkey) {
    this.content = Encryption.encrypt(this.content, privkey, pubkey);
  }
}

module.exports = TextPost;
