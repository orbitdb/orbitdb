'use strict'

var request = require('./BetterRequest');

class HashCacheClient {
  constructor(host, credentials) {
    this.host        = host
    this.credentials = credentials
    this.linkedList  = this.linkedList.bind(this)
  }

  linkedList(hash, password) {
    return {
      head: () => this._get(hash, password),
      add: (head) => this._add(hash, password, head),
      setMode: (mode) => this._setModes(hash, password, mode),
      delete: () => this._delete(hash, password)
    }
  }

  _get(hash, password) {
    return new Promise((resolve, reject) => {
      request
        .get(this.host + '/channel/' + hash)
        .set('Authorization', this.credentials)
        .send({ password: password })
        .end((err, res) => { this._resolveRequest(err, res, resolve, reject) });
    })
  }

  _add(hash, password, head) {
    return new Promise((resolve, reject) => {
      request
        .put(this.host + '/channel/' + hash + '/add')
        .set('Authorization', this.credentials)
        .send({ head: head, password: password })
        .end((err, res) => { this._resolveRequest(err, res, resolve, reject) });
    })
  }

  _setModes(hash, password, modes) {
    return new Promise((resolve, reject) => {
      request
        .post(this.host + '/channel/' + hash)
        .set('Authorization', this.credentials)
        .send({ modes: modes, password: password })
        .end((err, res) => { this._resolveRequest(err, res, resolve, reject) });
    })
  }

  _delete(hash, password) {
    return new Promise((resolve, reject) => {
      request
        .delete(this.host + '/channel/' + hash)
        .set('Authorization', this.credentials)
        .end((err, res) => { this._resolveRequest(err, res, resolve, reject) });
    })
  }

  _resolveRequest(err, res, resolve, reject) {
    if(err)
      reject(res ? res : err.toString());
    else
      resolve(res ? res : {});
  }
}

module.exports = {
  connect: (host, username, password) => {
    var credentials = `Basic ${username}=${password}`;
    return new Promise((resolve, reject) => {
      request
        .post(host + '/register')
        .set('Authorization', credentials)
        .end((err, res) => {
          if(err)
            reject(res ? res.body.message : err.toString())
          else
            resolve(new HashCacheClient(host, credentials, res));
        })
    })
  }
}
