'use strict';

const io   = require('socket.io-client');
const List = require('./list/OrbitList');

class Pubsub {
  constructor(ipfs, host, port, username, password) {
    this.ipfs = ipfs;
    this._subscriptions = {};
    this._socket = io(`http://${host}:${port}`);
    this._socket.on('connect', (socket) => console.log('Connected to', `http://${host}:${port}`));
    this._socket.on('message', this._handleMessage.bind(this));
  }

  subscribe(hash, password, callback) {
    if(!this._subscriptions[hash]) {
      this._subscriptions[hash] = { head: null, callback: callback };
      this._socket.emit('subscribe', { channel: hash });
    }
  }

  unsubscribe(hash) {
    this._socket.emit('unsubscribe', { channel: hash });
    delete this._subscriptions[hash];
  }

  publish(hash, message) {
    this._socket.send({ channel: hash, message: message });
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
