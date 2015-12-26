'use strict';

var path     = require('path');
var async    = require('asyncawait/async');
var await    = require('asyncawait/await');
var Promise  = require('bluebird');
var ipfsdCtl = require('ipfsd-ctl');

let getUserHome = () => {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
};

let ipfsPath = path.resolve(getUserHome() + '/.ipfs');

var startIpfs = async (() => {
  let ipfs, nodeInfo;

  try {
    var ipfsNode = Promise.promisify(ipfsdCtl.local.bind(ipfsPath))
    var ipfsd    = await (ipfsNode());
    var start    = Promise.promisify(ipfsd.startDaemon.bind(ipfsd));
    ipfs         = await (start());
    var getId    = Promise.promisify(ipfs.id);
    nodeInfo     = await (getId())
  } catch(e) {
    console.log("Error initializing ipfs daemon:", e);
    return null;
  }

  return { daemon: ipfs, nodeInfo: nodeInfo };
});

module.exports = async(() => {
  return await(startIpfs());
});
