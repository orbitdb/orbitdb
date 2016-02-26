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

const prefix = process.argv[4] ? process.argv[4] : 'LambOfGod';

let run = (async(() => {
  try {
    var orbit = OrbitClient.connect(host, port, username, password);
    const c1 = process.argv[2] ? process.argv[2] : 'c1';
    const channel = orbit.channel(c1);

    let count = 1;
    let id = 'Log: Query '
    let running = false;

    setInterval(async(() => {
      if(!running) {
        running = true;

        let timer = new Timer(true);
        channel.add(prefix + count);
        console.log(`Query #${count} took ${timer.stop(true)} ms\n`);

        let timer2 = new Timer(true);
        let items = channel.iterator({ limit: 10 }).collect();
        console.log("---------------------------------------------------")
        console.log("Key | Value")
        console.log("---------------------------------------------------")
        console.log(items.map((e) => `${e.payload.key} | ${e.payload.value}`).join("\n"));
        console.log("---------------------------------------------------")
        console.log(`Query 2 #${count} took ${timer2.stop(true)} ms\n`);

        running = false;
        count ++;
      }
    }), process.argv[5] ? process.argv[5] : 1000);

  } catch(e) {
    console.error("error:", e);
    console.error(e.stack);
    process.exit(1);
  }
}))();

module.exports = run;
