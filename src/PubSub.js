'use strict';

var async = require('asyncawait/async');
var await = require('asyncawait/await');
var redis = require("redis");
var Aggregator    = require('./Aggregator');

class PubSub {
  constructor(ipfs, host, port, username, password, resolve) {
    this.ipfs = ipfs;
    this._subscriptions = {};
    this.client1 = redis.createClient({ host: host, port: port });
    this.client2 = redis.createClient({ host: host, port: port });
    this.client3 = redis.createClient({ host: host, port: port });
    this.client1.on("message", this._handleMessage.bind(this));
    this.publishQueue = [];

    this.client1.on('connect', function() {
      console.log('redis connected');
      resolve();
    });

    this.client1.on("subscribe", function (channel, count) {
      console.log("subscribed to pubsub topic '" + channel + "' (" + count + " peers)");
    });
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
      this.client3.get("orbit." + hash, (err, reply) => {
        if(reply) {
          let d = JSON.parse(reply);
          this._subscriptions[hash].seq = d.seq;
          this._subscriptions[hash].head = d.head;
          if(err) console.log(err);
          console.log(`head of '${hash}' is`, this._subscriptions[hash].head, "seq:", this._subscriptions[hash].seq);
        }
      });
      this.client1.subscribe(hash);
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log("pubsub initialized")
        resolve();
      }, 1000);
    });
  }

  unsubscribe(hash) {
    delete this._subscriptions[hash];
    this.client1.unsubscribe();
    this.client2.unsubscribe();
  }

  publish(hash, message, seq, callback) {
    return new Promise((resolve, reject) => {
      // setTimeout(() => {
      //   console.log("timeout")
      //   this.publishQueue.pop();
      //   resolve(false);
      // }, 2000)

      // if(this.publishQueue.length === 0) {
        this.publishQueue.splice(0, 0, { hash: message.Hash, callback: resolve });
        this.client2.publish(hash, JSON.stringify({ hash: message.Hash, seq: seq }));
      // } else {
      //   console.log("too early")
      //   resolve(false);
      // }
    });
  }

  latest(hash, password) {
    return { head: this._subscriptions[hash].head, modes: {}, seq: this._subscriptions[hash].seq };
  }

  delete(hash, password) {
    delete this._subscriptions[hash];
  }

  _handleMessage(hash, event) {
    // console.log(".")
    if(this._subscriptions[hash]) {
      var message = JSON.parse(event)
      var newHead = message.hash;
      var seq     = message.seq;
      var isNewer = seq > this._subscriptions[hash].seq;
      var item    = this.publishQueue[this.publishQueue.length - 1];

      // console.log(".", newHead, item ? item.hash : '', seq, this._subscriptions[hash].seq, isNewer)

      // console.log(isNewer, seq, this._subscriptions[hash].seq)
      if(item) {
        this.publishQueue.pop();
        item.callback(isNewer && newHead === item.hash);
      }

      if(isNewer)
        this._updateSubscription(hash, newHead, seq);
    }
  }

  _updateSubscription(hash, message, seq) {
    this.client3.set("orbit." + hash, JSON.stringify({ head: message, seq: seq }));
    this._subscriptions[hash].seq = seq;
    this._subscriptions[hash].head = message;

    if(this._subscriptions[hash].callback)
      this._subscriptions[hash].callback(hash, message, seq);
  }

}

module.exports = PubSub;
