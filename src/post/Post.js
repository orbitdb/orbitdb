'use strict';

const async       = require('asyncawait/async');
const await       = require('asyncawait/await');
const ipfsAPI     = require('orbit-common/lib/ipfs-api-promised');
const Encryption  = require('orbit-common/lib/Encryption');

const TextPost    = require('./TextPost');
const FilePost    = require('./FilePost');
const OrbitDBItem = require('./OrbitDBItem');

const PostTypes = {
  Message: TextPost,
  Snippet: "snippet",
  File: FilePost,
  List: "list",
  Link: "link",
  OrbitDBItem: OrbitDBItem
};

// Factory
class Posts {
  static create(ipfs, type, data) {
    return new Promise((resolve, reject) => {
      let post;
      if(type === PostTypes.Message) {
        post = new PostTypes.Message(data);
      } else if(type === PostTypes.File) {
        post = new PostTypes.File(data.content, data.file, data.size);
      } else if(type == PostTypes.OrbitDBItem) {
        post = new PostTypes.OrbitDBItem(data.operation, data.key, data.value, data.meta);
      }
      const res = await (ipfsAPI.putObject(ipfs, JSON.stringify(post)));
      resolve(res);
    })
  }

  static get Types() {
    return PostTypes;
  }
}

module.exports = Posts;
