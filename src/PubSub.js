'use strict';

const io = require('socket.io-client');

class Pubsub {
  constructor(ipfs) {
    this.ipfs = ipfs;
    this._subscriptions = {};
    this.onConnected = null;
    this.onConnectionError = null;
  }

  connect(host, port, username, password) {
    return new Promise((resolve, reject) => {
      this._socket = io.connect(`http://${host}:${port}`, { 'forceNew': true });
      this._socket.on('connect', resolve);
      this._socket.on('connect_error', (err) => reject(new Error(`Connection refused to ${host}:${port}`)));
      this._socket.on('disconnect', (socket) => console.log(`Disconnected from http://${host}:${port}`));
      this._socket.on('error', (e) => console.log('Pubsub socket error:', e));
      this._socket.on('message', this._handleMessage.bind(this));
      this._socket.on('latest', this._handleMessage.bind(this));
    });
  }

  disconnect() {
    if(this._socket)
      this._socket.disconnect();
  }

  subscribe(hash, password, callback) {
    if(!this._subscriptions[hash]) {
      this._subscriptions[hash] = { callback: callback };
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
    if(this._subscriptions[hash] && this._subscriptions[hash].callback)
      this._subscriptions[hash].callback(hash, message);
  }
}

module.exports = Pubsub;
