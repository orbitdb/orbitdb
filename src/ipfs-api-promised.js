'use strict';

var async        = require('asyncawait/async');
var await        = require('asyncawait/await');
var Promise      = require('bluebird');

var ipfsAPI = {
  cat: (ipfs, hash, cb) => {
    var ipfscat = Promise.promisify(ipfs.cat);
    return ipfscat(hash);
  },
  ls: async ((ipfs, hash) => {
    var ipfsls = Promise.promisify(ipfs.ls);
    return ipfsls(hash);
  }),
  add: async ((ipfs, filePath) => {
    var addFiles = Promise.promisify((filePath, cb) => {
      ipfs.add(filePath, { recursive: true }, cb);
    });
    return addFiles(filePath);
  }),
  getObject: async ((ipfs, hash) => {
    var getObject = Promise.promisify(ipfs.object.get);
    return getObject(hash);
  }),
  putObject: async ((ipfs, payload) => {
    var putObject = Promise.promisify((payload, cb) => {
      ipfs.object.put(new Buffer(JSON.stringify({ Data: payload })), "json", cb);
    });
    return putObject(payload);
  }),
  patchObject: async ((ipfs, root, target) => {
    var patchObject = Promise.promisify((root, target, cb) => {
      ipfs.object.patch(root, ["add-link", "next", target], cb);
    });
    return patchObject(root, target);
  }),
  statObject: async ((ipfs, hash) => {
    var getObject = Promise.promisify(ipfs.object.stat);
    return getObject(hash);
  }),
  pinObject: async ((ipfs, hash) => {
    var pinObject = Promise.promisify(ipfs.pin.add);
    return pinObject(hash);
  }),
  getPinned: async ((ipfs) => {
    var getPinned = Promise.promisify(ipfs.pin.list);
    var list      = await (getPinned());
    return Object.keys(list.Keys);
  }),
  swarmPeers: async ((ipfs) => {
    var getPeers = Promise.promisify(ipfs.swarm.peers);
    return getPeers();
  }),
  swarmConnect: async ((ipfs, hash) => {
    var connect = Promise.promisify(ipfs.swarm.connect);
    return await (connect(hash));
  }),
  dhtPut: async ((ipfs, key, value) => {
    var put = Promise.promisify(ipfs.dht.put);
    return put(key, value);
  }),
  dhtGet: async ((ipfs, key) => {
    var get = Promise.promisify(ipfs.dht.get);
    return get(key);
  }),
  dhtQuery: async ((ipfs, peerID) => {
    var query = Promise.promisify(ipfs.dht.query);
    return query(peerID);
  }),
  dhtFindProviders: async ((ipfs, hash) => {
    var findprov = Promise.promisify(ipfs.dht.findprovs);
    return findprov(hash);
  }),
  dhtFindPeer: async ((ipfs, peerID) => {
    var findpeer = Promise.promisify(ipfs.dht.findpeer);
    return findpeer(peerID);
  })
}

module.exports = ipfsAPI;
