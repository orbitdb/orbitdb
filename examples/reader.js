'use strict';

const async       = require('asyncawait/async');
const await       = require('asyncawait/await');
const OrbitClient = require('../src/OrbitClient');
const Timer       = require('./Timer');

// usage: reader.js <host> <username> <channel> <data> <interval in ms>

// orbit-server
const host = process.argv[2] ? process.argv[2] : 'localhost'
const port = 3333;

const username = process.argv[3] ? process.argv[3] : 'LambOfGod';
const password = '';

const prefix = process.argv[5] ? process.argv[5] : 'Hello';

let run = (async(() => {
  try {
    var orbit = OrbitClient.connect(host, port, username, password);
    const channelName = process.argv[4] ? process.argv[4] : 'test';
    const channel = orbit.channel(channelName);

    let count = 1;
    let running = false;

    setInterval(async(() => {
      if(!running) {
        running = true;

        let timer = new Timer(true);
        channel.add(prefix + count);
        console.log(`Query #${count} took ${timer.stop(true)} ms\n`);

        let timer2 = new Timer(true);
        let items = channel.iterator({ limit: 20 }).collect();
        console.log("---------------------------------------------------")
        console.log("Key | Value")
        console.log("---------------------------------------------------")
        console.log(items.map((e) => `${e.key} | ${e.value}`).join("\n"));
        console.log("---------------------------------------------------")
        console.log(`Query 2 #${count} took ${timer2.stop(true)} ms\n`);

        running = false;
        count ++;
      }
    }), process.argv[6] ? process.argv[6] : 1000);

  } catch(e) {
    console.error(e.stack);
    console.log("Exiting...")
    process.exit(1);
  }
}))();

module.exports = run;
