'use strict';

const io     = require('socket.io-client');
const logger = require('orbit-common/lib/logger')("orbit-db.Pubsub");

class Pubsub {
  constructor(ipfs) {
    this.ipfs = ipfs;
    this._socket = null;
    this._subscriptions = {};
    this.onConnected = null;
    this.onConnectionError = null;
  }

  connect(host, port, username, password) {
    return new Promise((resolve, reject) => {
      if(!this._socket)
        this._socket = io.connect(`http://${host}:${port}`, { 'forceNew': true });

      this._socket.on('connect', resolve);
      this._socket.on('connect_error', (err) => reject(new Error(`Connection refused to Pubsub at '${host}:${port}'`)));
      this._socket.on('disconnect', (socket) => logger.warn(`Disconnected from Pubsub at 'http://${host}:${port}'`));
      this._socket.on('error', (e) => logger.error('Pubsub socket error:', e));
      this._socket.on('message', this._handleMessage.bind(this));
      this._socket.on('subscribed', this._handleMessage.bind(this));
    });
  }

  disconnect() {
    if(this._socket)
      this._socket.disconnect();
  }

  subscribe(hash, password, callback) {
    if(!this._subscriptions[hash]) {
      this._subscriptions[hash] = { callback: callback };
      this._socket.emit('subscribe', { channel: hash }); // calls back with 'subscribed' event
    }
  }

  unsubscribe(hash) {
    this._socket.emit('unsubscribe', { channel: hash });
    delete this._subscriptions[hash];
  }

  publish(hash, message) {
    this._socket.send(JSON.stringify({ channel: hash, message: message }));
  }

  _handleMessage(hash, message) {
    if(this._subscriptions[hash] && this._subscriptions[hash].callback)
      this._subscriptions[hash].callback(hash, message);
  }
}

module.exports = Pubsub;
