'use strict';

const async   = require('asyncawait/async');
const await   = require('asyncawait/await');
const ipfsd   = require('ipfsd-ctl');
const OrbitDB = require('../src/OrbitDB');
const Timer   = require('./Timer');

// usage: keyvalue.js <host> <username> <channel> <key> <value>

// orbit-server
const host = process.argv[2] ? process.argv[2] : 'localhost'
const port = 3333;

const username = process.argv[3] ? process.argv[3] : 'LambOfGod';
const password = '';

const channel = process.argv[4] ? process.argv[4] : 'testing123';

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
    const orbit = await(OrbitDB.connect(host, port, username, password, ipfs));
    const db = await(orbit.kvstore(channel));

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
