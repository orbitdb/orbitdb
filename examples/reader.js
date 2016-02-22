'use strict';

var async       = require('asyncawait/async');
var await       = require('asyncawait/await');
var OrbitClient = require('../src/OrbitClient');
var Timer       = require('./Timer');

// Redis
var host = 'localhost';
var port = 6379;

var username = 'LambOfGod';
var password = '';

let run = (async(() => {
  try {
    var orbit = OrbitClient.connect(host, port, username, password);
    const c1 = 'c1';
    const channel = orbit.channel(c1);

    let count = 1;
    let id = 'Log: Query '
    let running = false;

    setInterval(async(() => {
      if(!running) {
        running = true;

        // let timer = new Timer(true);
        channel.add("Hello " + count);
        // console.log(`Query #${count} took ${timer.stop(true)} ms\n`);

        const c = channel.iterator({ limit: -1 }).collect().length;
        let items = channel.iterator({ limit: 5 }).collect();
        console.log("---------------------------------------------------")
        console.log("Key | Value")
        console.log("---------------------------------------------------")
        console.log(items.map((e) => `${e.payload.key} | ${e.payload.value}`).join("\n"));
        console.log("---------------------------------------------------")
        console.log(`Found ${items.length} items from ${c}\n`);

        running = false;
        count ++;
      }
    }), 500);

  } catch(e) {
    console.error("error:", e);
    console.error(e.stack);
    process.exit(1);
  }
}))();

module.exports = run;
