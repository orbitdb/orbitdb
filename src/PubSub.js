'use strict';

var async     = require('asyncawait/async');
var await     = require('asyncawait/await');
var HashCache = require('./HashCacheClient');

class PubSub {
  constructor(host, username, password) {
    this._subscriptions = [];
    this._messages      = {};
    this._client        = await(HashCache.connect(host, username, password));

    // Poll for the new head
    setInterval(async(() => {
      Object.keys(this._subscriptions).forEach(this._poll.bind(this));
    }), 500);
  }

  _poll(hash) {
    const currentHead = this._subscriptions[hash].head;
    const channel     = await(this._client.linkedList(hash, this._subscriptions[hash].password).head());
    const newHead     = channel.head;
    if(currentHead !== newHead) {
      // console.log("NEW HEAD!", newHead);

      this._subscriptions[hash].head = newHead;

      if(!this._messages[hash])
        this._messages[hash] = [];

      this._messages[hash].push(newHead);

      if(this._subscriptions[hash].callback)
        this._subscriptions[hash].callback(hash, newHead);
    }
  }

  subscribe(channel, password, callback) {
    if(!this._subscriptions[channel] || this._subscriptions[channel].password !== password) {
      console.log("SUBSCRIBE:", channel);
      this._subscriptions[channel] = {
        channel: channel,
        password: password,
        head: null,
        callback: callback
      };
    }
  }

  unsubscribe(channel) {
    delete this._subscriptions[channel];
    delete this._messages[channel];
  }

  publish(hash, message) {
    if(!this._messages[hash]) this._messages[hash] = [];
    await(this._client.linkedList(hash, this._subscriptions[hash].password).add(message));
  }

  latest(hash) {
    return { head: this._messages[hash] && this._messages[hash].length > 0 ? this._messages[hash][this._messages[hash].length - 1] : null, modes: {} };
  }

  delete(hash) {
    this._messages[hash] = [];
  }
}

module.exports = PubSub;
