'use strict';

var fs   = require('fs');
var path = require('path');

var getAppPath = () => {
  return process.type && process.env.ENV !== "dev" ? process.resourcesPath + "/app/" : process.cwd();
}

var privkey = fs.readFileSync(path.resolve(getAppPath(), 'keys/private.pem')).toString('ascii');
var pubkey  = fs.readFileSync(path.resolve(getAppPath(), 'keys/public.pem')).toString('ascii');

module.exports = {
  getKeys: (hash) => {
    return {
      publicKey: pubkey,
      privateKey: privkey
    };
  }
}