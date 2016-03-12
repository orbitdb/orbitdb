'use strict';

const Post = require('./BasePost');

// A reference to a file
class DirectoryPost extends Post {
  constructor(name, hash, size) {
    super("directory");
    this.name = name;
    this.hash = hash;
    this.size = size;
  }
}

module.exports = DirectoryPost;
