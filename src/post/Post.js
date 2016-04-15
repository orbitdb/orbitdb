'use strict';

const Buffer        = require('buffer').Buffer;
const Post          = require('./BasePost');
const TextPost      = require('./TextPost');
const FilePost      = require('./FilePost');
const DirectoryPost = require('./DirectoryPost');
const OrbitDBItem   = require('./OrbitDBItem');
const MetaInfo      = require('./MetaInfo');
const Poll          = require('./Poll');

const PostTypes = {
  Message: TextPost,
  Snippet: "snippet",
  File: FilePost,
  Directory: DirectoryPost,
  Link: "link",
  OrbitDBItem: OrbitDBItem,
  Poll: Poll
};

// Factory
class Posts {
  static create(ipfs, type, data) {
    return new Promise((resolve, reject) => {
      let post;

      if(type === PostTypes.Message) {
        post = new PostTypes.Message(data.content);
      } else if(type === PostTypes.File) {
        post = new PostTypes.File(data.name, data.hash, data.size);
      } else if(type == PostTypes.Directory) {
        post = new PostTypes.Directory(data.name, data.hash, data.size);
      } else if(type == PostTypes.OrbitDBItem) {
        post = new PostTypes.OrbitDBItem(data.operation, data.key, data.value);
      } else if(type == PostTypes.Poll) {
        post = new PostTypes.Poll(data.question, data.options);
      }

      const size = data.size ? data.size : Buffer.byteLength(data, 'utf8');
      post.meta = new MetaInfo(post.type, size, new Date().getTime(), data.from);
      if(post.type) delete post.type;
      ipfs.object.put(new Buffer(JSON.stringify({ Data: JSON.stringify(post) })), "json")
        .then((res) => resolve({ Post: post, Hash: res.Hash }))
        .catch(reject);
    });
  }

  static get Types() {
    return PostTypes;
  }
}

module.exports = Posts;
