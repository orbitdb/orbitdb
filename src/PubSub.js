'use strict';

const redis = require("redis");
const List  = require('./list/OrbitList');

class Pubsub {
  constructor(ipfs, host, port, username, password) {
    this.ipfs = ipfs;
    this._subscriptions = {};
    this.client1 = redis.createClient({ host: host, port: port });
    this.client2 = redis.createClient({ host: host, port: port });
    this.client1.on("message", this._handleMessage.bind(this));
    // this.client1.on('connect', () => console.log('redis connected'));
    // this.client1.on("subscribe", (channel, count) => console.log(`subscribed to ${channel}`));
  }

  subscribe(hash, password, callback) {
    if(!this._subscriptions[hash] || this._subscriptions[hash].password !== password) {
      this._subscriptions[hash] = {
        password: password,
        head: null,
        callback: callback
      };
      this.client1.subscribe(hash);
    }
  }

  unsubscribe(hash) {
    delete this._subscriptions[hash];
    this.client1.unsubscribe();
    this.client2.unsubscribe();
  }

  publish(hash, message) {
    this.client2.publish(hash, message);
  }

  latest(hash) {
    return { head: this._subscriptions[hash] ? this._subscriptions[hash].head : null };
  }

  _handleMessage(hash, message) {
    if(this._subscriptions[hash]) {
      this._subscriptions[hash].head = message;

      if(this._subscriptions[hash].callback)
        this._subscriptions[hash].callback(hash, message);
    }
  }
}

module.exports = Pubsub;
