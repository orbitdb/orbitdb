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

    // setInterval(async(() => {
    //   if(!running) {
    while(true) {
        running = true;

        const key = "Lamb";
        let timer = new Timer(true);
        channel.put(key, "Of God " + count);
        let v = channel.get(key);
        console.log(`Query #${count} took ${timer.stop(true)} ms\n`);

        console.log("---------------------------------------------------")
        console.log("Key | Value")
        console.log("---------------------------------------------------")
        console.log(`${key} | ${v}`);
        console.log("---------------------------------------------------")

        running = false;
        count ++;
    }
      // }
    // }), 500);

  } catch(e) {
    console.error("error:", e);
    console.error(e.stack);
    process.exit(1);
  }
}))();

module.exports = run;
