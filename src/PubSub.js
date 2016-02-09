'use strict';

var async = require('asyncawait/async');
var await = require('asyncawait/await');
var redis = require("redis");
var Aggregator    = require('./Aggregator');

class PubSub {
  constructor(ipfs, host, username, password) {
    this.ipfs = ipfs;
    this._subscriptions = {};
    this.client1 = redis.createClient();
    this.client2 = redis.createClient();
    this.currentPost = null;

    this.client1.on("message", async((hash, message) => {
      const currentHead = this._subscriptions[hash] ? this._subscriptions[hash].head : null;
      if(this._subscriptions[hash]) {
        let item = Aggregator._fetchOne(this.ipfs, message, this._subscriptions[hash].password);

        if(item.seq > this._subscriptions[hash].seq) {
          this._subscriptions[hash].seq = item.seq;

          if(currentHead !== message)
            this._handleNewMessage(hash, message);

          if(this.currentPost) {
            if(message === this.currentPost.hash) {
              this.currentPost.callback(true);
              this.currentPost = null;
            } else {
              this.currentPost.callback(false);
            }
          }
        }
      }
    }));
  }

  subscribe(hash, password, callback) {
    if(!this._subscriptions[hash] || this._subscriptions[hash].password !== password) {
      this._subscriptions[hash] = {
        topic: hash,
        password: password,
        head: null,
        callback: callback,
        seq: -1
      };
      this.client1.subscribe(hash);
    }
  }

  unsubscribe(hash) {
    delete this._subscriptions[hash];
    this.client1.unsubscribe();
    this.client2.unsubscribe();
  }

  publish(hash, message, callback) {
    return new Promise((resolve, reject) => {
      this.currentPost = { hash: message.Hash, callback: resolve };
      this.client2.publish(hash, message.Hash);
    });
  }

  latest(hash, password) {
    return { head: this._subscriptions[hash].head, modes: {}, seq: this._subscriptions[hash].seq };
  }

  delete(hash, password) {
    delete this._subscriptions[hash];
  }

  _handleNewMessage(hash, newHead) {
    this._subscriptions[hash].head = newHead;
    if(this._subscriptions[hash].callback)
      this._subscriptions[hash].callback(hash, newHead);
  }

}

module.exports = PubSub;
