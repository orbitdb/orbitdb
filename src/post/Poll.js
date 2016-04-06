'use strict';

const Post = require('./BasePost');

// A poll / vote
class Poll extends Post {
  constructor(question, options) {
    super("poll");
    this.question = question;
    this.options = options;
  }
}

module.exports = Poll;
