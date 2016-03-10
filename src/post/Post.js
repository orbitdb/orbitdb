'use strict';

const async       = require('asyncawait/async');
const await       = require('asyncawait/await');
const ipfsAPI     = require('orbit-common/lib/ipfs-api-promised');
const Encryption  = require('orbit-common/lib/Encryption');

const TextPost      = require('./TextPost');
const FilePost      = require('./FilePost');
const DirectoryPost = require('./DirectoryPost');
const OrbitDBItem   = require('./OrbitDBItem');
const MetaInfo      = require('./MetaInfo');

const PostTypes = {
  Message: TextPost,
  Snippet: "snippet",
  File: FilePost,
  Directory: DirectoryPost,
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
        post = new PostTypes.File(data.name, data.hash, data.size);
      } else if(type == PostTypes.Directory) {
        post = new PostTypes.Directory(data.name, data.hash, data.size);
      } else if(type == PostTypes.OrbitDBItem) {
        post = new PostTypes.OrbitDBItem(data.operation, data.key, data.value, data.meta, data.by);
      }

      const size = data.size ? data.size : Buffer.byteLength(data, 'utf8');
      post.meta = new MetaInfo(post.type, size, new Date().getTime());
      if(post.type) delete post.type;
      const res = await (ipfsAPI.putObject(ipfs, JSON.stringify(post)));
      resolve({ Post: post, Hash: res.Hash });
    })
  }

  static get Types() {
    return PostTypes;
  }
}

module.exports = Posts;
