'use strict';

const async       = require('asyncawait/async');
const await       = require('asyncawait/await');
const OrbitClient = require('../src/Client');
const Timer       = require('./Timer');

// usage: keyvalueReader.js <host> <username> <channel> <key>

// orbit-server
const host = process.argv[2] ? process.argv[2] : 'localhost'
const port = 3333;

const username = process.argv[3] ? process.argv[3] : 'LambOfGod';
const password = '';

let run = (async(() => {
  try {
    const orbit = OrbitClient.connect(host, port, username, password);
    const channel = process.argv[4] ? process.argv[4] : 'testing123';
    const db = orbit.channel(channel);

    let count = 1;

    setInterval(async(() => {
      const key = process.argv[5] ? process.argv[5] : 'greeting';
      let timer = new Timer(true);
      const result = db.get(key);

      console.log("---------------------------------------------------")
      console.log("Key | Value")
      console.log("---------------------------------------------------")
      console.log(`${key} | ${result}`);
      console.log("---------------------------------------------------")
      console.log(`Query #${count} took ${timer.stop(true)} ms\n`);

      count ++;
    }), 1000);
  } catch(e) {
    console.error("error:", e);
    console.error(e.stack);
    process.exit(1);
  }
}))();

module.exports = run;
