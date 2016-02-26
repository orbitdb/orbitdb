'use strict';

const async       = require('asyncawait/async');
const await       = require('asyncawait/await');
const OrbitClient = require('../src/OrbitClient');
const Timer       = require('./Timer');

// orbit-server
const host = 'localhost';
const port = 3333;

const username = process.argv[3] ? process.argv[3] : 'LambOfGod';
const password = '';

let run = (async(() => {
  try {
    const orbit = OrbitClient.connect(host, port, username, password);
    const channel = process.argv[2] ? process.argv[2] : 'testing123';
    const db = orbit.channel(channel);

    let count = 1;

    setInterval(async(() => {
      const key = process.argv[4] ? process.argv[4] : 'greeting';
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
