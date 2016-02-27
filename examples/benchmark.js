'use strict';

var async       = require('asyncawait/async');
var OrbitClient = require('../src/OrbitClient');
var Timer       = require('./Timer');

// orbit-server
const host = process.argv[2] ? process.argv[2] : 'localhost'
const port = 3333;

var username = process.argv[3] ? process.argv[3] : 'testrunner';
var password = '';

let run = (async(() => {
  try {
    // Connect
    var orbit = OrbitClient.connect(host, port, username, password);

    const channelName = process.argv[4] ? process.argv[4] : 'c1';
    const db = orbit.channel(channelName);

    // Metrics
    let totalQueries = 0;
    let seconds = 0;
    let queriesPerSecond = 0;
    let lastTenSeconds = 0;

    // Metrics output
    setInterval(() => {
      seconds ++;

      if(seconds % 10 === 0) {
        console.log(`--> Average of ${lastTenSeconds/10} q/s in the last 10 seconds`)
        lastTenSeconds = 0
      }

      console.log(`${queriesPerSecond} queries per second, ${totalQueries} queries in ${seconds} seconds`)
      queriesPerSecond = 0;
    }, 1000);

    while(true) {
      let g = db.add(username + totalQueries);
      totalQueries ++;
      lastTenSeconds ++;
      queriesPerSecond ++;
    }

  } catch(e) {
    console.error("error:", e);
    console.error(e.stack);
    process.exit(1);
  }
}))();

module.exports = run;
