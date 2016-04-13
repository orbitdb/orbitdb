'use strict';

const async       = require('asyncawait/async');
const await       = require('asyncawait/await');
const OrbitClient = require('../src/Client');
const Timer       = require('./Timer');

// usage: keyvalue.js <host> <username> <channel> <key> <value>

// orbit-server
const host = process.argv[2] ? process.argv[2] : 'localhost'
const port = 3333;

const username = process.argv[3] ? process.argv[3] : 'LambOfGod';
const password = '';

const channel = process.argv[4] ? process.argv[4] : 'testing123';

let run = (async(() => {
  try {
    const orbit = await(OrbitClient.connect(host, port, username, password));
    const db = await(orbit.channel(channelName));

    let count = 1;

    while(true) {
      const key = process.argv[5] ? process.argv[5] : 'greeting';
      const value = process.argv[6] ? process.argv[6] : 'Hello world';
      const timer = new Timer(true);
      db.put(key, value + " " + count);
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
