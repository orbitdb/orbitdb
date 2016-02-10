'use strict';

var async = require('asyncawait/async');
var await = require('asyncawait/await');
var redis = require("redis");
var Aggregator    = require('./Aggregator');

class PubSub {
  constructor(ipfs, host, port, username, password) {
    this.ipfs = ipfs;
    this._subscriptions = {};
    this.client1 = redis.createClient({ host: host, port: port });
    this.client2 = redis.createClient({ host: host, port: port });
    this.client1.on("message", this._handleMessage.bind(this));
    this.publishQueue = [];
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

  publish(hash, message, seq, callback) {
    return new Promise((resolve, reject) => {
      if(this.publishQueue.length === 0)
        this.publishQueue.splice(0, 0, { hash: message.Hash, callback: resolve });
        this.client2.publish(hash, JSON.stringify({ hash: message.Hash, seq: seq }));
        setTimeout(() => resolve(false), 1000)
    });
  }

  latest(hash, password) {
    return { head: this._subscriptions[hash].head, modes: {}, seq: this._subscriptions[hash].seq };
  }

  delete(hash, password) {
    delete this._subscriptions[hash];
  }

  _handleMessage(hash, event) {
    if(this._subscriptions[hash]) {
      var message = JSON.parse(event)
      var newHead = message.hash;
      var seq     = message.seq;
      var isNewer = seq > this._subscriptions[hash].seq;
      var item    = this.publishQueue[this.publishQueue.length - 1];

      // console.log(".", isNewer, newHead, item ? item.hash : '', seq, this._subscriptions[hash].seq, message)

      if(item) {
        item.callback(isNewer && newHead === item.hash);
        this.publishQueue.pop();
      }

      // console.log(isNewer, seq, this._subscriptions[hash].seq)
      if(isNewer)
        this._updateSubscription(hash, newHead, seq);
    }
  }

  _updateSubscription(hash, message, seq) {
    this._subscriptions[hash].seq = seq;
    this._subscriptions[hash].head = message;
    this._subscriptions[hash].callback(hash, message, seq);
  }

}

module.exports = PubSub;
