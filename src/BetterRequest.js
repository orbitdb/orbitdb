'use strict'

var unirest  = require('unirest')

class Request {
  constructor() {
    this.url     = '';
    this.method  = 'GET';
    this.headers = {};
    this.body    = {};
  }

  get(url) {
    return this._init('GET', url);
  }

  post(url) {
    return this._init('POST', url);
  }

  put(url) {
    return this._init('PUT', url);
  }

  delete(url) {
    return this._init('DELETE', url);
  }

  _init(method, url) {
    this.url     = url;
    this.method  = method;
    this.body    = {};
    this.headers = {};
    return this;
  }

  set(key, value) {
    this.headers[key] = value;
    return this;
  }

  send(body) {
    this.body = body;
    return this;
  }

  end(callback) {
    if(!this.url.startsWith("http"))
      this.url = "http://" + this.url

    unirest(this.method, this.url)
      .headers(this.headers)
      .type('application/json')
      .send(this.body)
      .end((res) => {
        if(res.error)
          callback(res.body ? res.body.message : "Connection refused", null);
        else
          callback(null, res.body);
      });
  }

}

module.exports = new Request();
