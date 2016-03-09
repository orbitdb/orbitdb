'use strict';

const TextPost = require('./TextPost');

// A reference to a file
class FilePost extends TextPost {
  constructor(content, file, size) {
    super(content);
    this.type = "file";
    this.file = file;
    this.size = size;
  }
}

module.exports = FilePost;
