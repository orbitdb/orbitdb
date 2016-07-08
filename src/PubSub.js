'use strict';

const io     = require('socket.io-client');
const logger = require('logplease').create("orbit-db.Pubsub");

class Pubsub {
  constructor() {
    this._socket = null;
    this._subscriptions = {};
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
      this._socket.on('subscribed', this._handleSubscribed.bind(this));
    });
  }

  disconnect() {
    if(this._socket)
      this._socket.disconnect();
  }

  subscribe(hash, password, callback, fetchHistory) {
    if(!this._subscriptions[hash]) {
      this._subscriptions[hash] = { callback: callback, history: fetchHistory };
      this._socket.emit('subscribe', { channel: hash }); // calls back with 'subscribed' event
    }
  }

  unsubscribe(hash) {
    if(this._subscriptions[hash]) {
      this._socket.emit('unsubscribe', { channel: hash });
      delete this._subscriptions[hash];
    }
  }

  publish(hash, message) {
    if(this._subscriptions[hash])
      this._socket.send(JSON.stringify({ channel: hash, message: message }));
  }

  _handleMessage(hash, message) {
    const subscription = this._subscriptions[hash];
    if(subscription && subscription.callback)
      subscription.callback(hash, message);
  }

  _handleSubscribed(hash, message) {
    const subscription = this._subscriptions[hash];
    if(subscription && subscription.history && subscription.callback)
      subscription.callback(hash, message);
  }
}

module.exports = Pubsub;
