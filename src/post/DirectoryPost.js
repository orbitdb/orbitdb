'use strict';

// A reference to a file
class DirectoryPost {
  constructor(name, hash, size) {
    this.type = "directory";
    this.name = name;
    this.hash = hash;
    this.size = size;
    this.ts = new Date().getTime();
  }
}

module.exports = DirectoryPost;
