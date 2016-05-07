'use strict';

const async   = require('asyncawait/async');
const await   = require('asyncawait/await');
const ipfsd   = require('ipfsd-ctl');
const OrbitDB = require('../src/OrbitDB');
const Timer   = require('./Timer');

// usage: keyvalue.js <network hash> <username> <channel> <key> <value>

// orbit-server
const network = 'QmYPobvobKsyoCKTw476yTui611XABf927KxUPCf4gRLRr'; // 'localhost:3333'
const username = process.argv[2] ? process.argv[2] : 'testrunner';
const password = '';
const channelName = process.argv[3] ? process.argv[3] : 'c1';

const startIpfs = () => {
  return new Promise((resolve, reject) => {
    ipfsd.disposableApi((err, ipfs) => {
      if(err) console.error(err);
      resolve(ipfs);
    });
  });
};

let run = (async(() => {
  try {
    const ipfs = await(startIpfs());
    const orbit = await(OrbitDB.connect(network, username, password, ipfs));
    const db = await(orbit.kvstore(channelName));

    let count = 1;

    while(true) {
      const key = process.argv[5] ? process.argv[5] : 'greeting';
      const value = process.argv[6] ? process.argv[6] : 'Hello world';
      const timer = new Timer(true);
      await(db.put(key, value + " " + count));
      const result = db.get(key);

      console.log("---------------------------------------------------")
      console.log("Key | Value")
      console.log("---------------------------------------------------")
      console.log(`${key} | ${result}`);
      console.log("---------------------------------------------------")
      console.log(`Query #${count} took ${timer.stop(true)} ms\n`);

      count ++;
    }

  } catch(e) {
    console.error(e.stack);
    process.exit(1);
  }
}))();

module.exports = run;
