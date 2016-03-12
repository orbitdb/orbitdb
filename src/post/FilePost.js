'use strict';

const Post = require('./BasePost');

// A reference to a file
class FilePost extends Post {
  constructor(name, hash, size) {
    super("file");
    this.name = name;
    this.hash = hash;
    this.size = size;
  }
}

module.exports = FilePost;
