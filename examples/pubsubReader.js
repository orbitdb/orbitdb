'use strict';

var async       = require('asyncawait/async');
var await       = require('asyncawait/await');
var OrbitClient = require('../src/OrbitClient');
var Timer       = require('./Timer');

// var host     = '178.62.229.175';
var host     = 'localhost';
var port     = 6379;

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
        channel.add(id + count);
        // console.log(`Query #${count} took ${timer.stop(true)} ms\n`);

        // console.log("Query...");
        const c = channel.iterator({ limit: -1 }).collect().length;
        let items = channel.iterator({ limit: 5 }).collect();
        console.log("---------------------------------------------------")
        console.log("Id | Seq | Ver | Data")
        console.log("---------------------------------------------------")
        console.log(items.map((e) => `${e.id} | ${e.seq} | ${e.ver} | ${e.data}`).join("\n"));
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
