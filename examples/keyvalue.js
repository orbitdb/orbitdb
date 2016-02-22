'use strict';

const async       = require('asyncawait/async');
const await       = require('asyncawait/await');
const OrbitClient = require('../src/OrbitClient');
const Timer       = require('./Timer');

// Redis
const host = 'localhost';
const port = 3333;

const username = 'LambOfGod';
const password = '';

let run = (async(() => {
  try {
    const orbit = OrbitClient.connect(host, port, username, password);
    const channel = 'testing123';
    const db = orbit.channel(channel);

    let count = 1;

    while(true) {
      const key = "username";
      let timer = new Timer(true);
      db.put(key, "Lamb Of God " + count);
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
