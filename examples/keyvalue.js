'use strict';

const async       = require('asyncawait/async');
const await       = require('asyncawait/await');
const OrbitClient = require('../src/OrbitClient');
const Timer       = require('./Timer');

// orbit-server
const host = 'localhost';
// const host = '178.62.241.75';
const port = 3333;

const username = process.argv[3] ? process.argv[3] : 'LambOfGod';
const password = '';

let run = (async(() => {
  try {
    const orbit = OrbitClient.connect(host, port, username, password);
    const channel = process.argv[2] ? process.argv[2] : 'testing123';
    const db = orbit.channel(channel);

    let count = 1;

    while(true) {
      const key = "username";
      let timer = new Timer(true);
      db.put(key, username + " " + count);
      let v = db.get(key);

      console.log("---------------------------------------------------")
      console.log("Key | Value")
      console.log("---------------------------------------------------")
      console.log(`${key} | ${v}`);
      console.log("---------------------------------------------------")
      console.log(`Query #${count} took ${timer.stop(true)} ms\n`);

      count ++;
    }

  } catch(e) {
    console.error("error:", e);
    console.error(e.stack);
    process.exit(1);
  }
}))();

module.exports = run;
