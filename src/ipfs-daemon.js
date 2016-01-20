'use strict';

var fs       = require('fs');
var path     = require('path');
var async    = require('asyncawait/async');
var await    = require('asyncawait/await');
var Promise  = require('bluebird');
var ipfsdCtl = require('ipfsd-ctl');

const getUserHome = () => {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
};

const ipfsPath = path.resolve(getUserHome() + '/.ipfs');

if(!fs.existsSync(ipfsPath))
  fs.mkdirSync(ipfsPath);

const startIpfs = async (() => {
  let ipfs, nodeInfo;

  try {
    const ipfsNode = Promise.promisify(ipfsdCtl.local.bind(ipfsPath))
    const ipfsd    = await (ipfsNode());
    const start    = Promise.promisify(ipfsd.startDaemon.bind(ipfsd));
    ipfs           = await (start());
    const getId    = Promise.promisify(ipfs.id);
    nodeInfo       = await (getId())
  } catch(e) {
    console.log("Error initializing ipfs daemon:", e);
    return null;
  }

  return { daemon: ipfs, nodeInfo: nodeInfo };
});

module.exports = async(() => {
  return await(startIpfs());
});
