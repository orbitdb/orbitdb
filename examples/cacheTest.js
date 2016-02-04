'use strict';

var async       = require('asyncawait/async');
var OrbitClient = require('../src/OrbitClient');
var Timer       = require('./Timer');

var host     = 'localhost:3006';
var username = 'testrunner';
var password = '';

let run = (async(() => {
  try {
    // Connect
    var orbit = OrbitClient.connect(host, username, password);

    console.log("-------- EVENT log -------")
    const c1 = 'cache-test';
    orbit.channel(c1).delete();

    var timer1 = new Timer(true);
    console.log("Writing...");
    for(let i = 0; i < 100; i ++) {
      orbit.channel(c1).add("hello " + i);
    }
    console.log("Write took", timer1.stop() + "ms");

    var timer2 = new Timer(true);
    console.log("Reading 1st time...");
    var items = orbit.channel(c1).iterator({ limit: -1 }).collect();
    items = items.map((e) => {
      return { key: e.item.key, val: e.item.Payload };
    });
    console.log("Reading 1st time took", timer2.stop() + "ms");

    var timer3 = new Timer(true);
    console.log("Reading 2nd time...");
    var items = orbit.channel(c1).iterator({ limit: -1 }).collect();
    items = items.map((e) => {
      return { key: e.item.key, val: e.item.Payload };
    });
    console.log("Reading 2nd time took", timer3.stop() + "ms");

    var timer4 = new Timer(true);
    console.log("Reading 3rd time...");
    var items = orbit.channel(c1).iterator({ limit: -1 }).collect();
    items = items.map((e) => {
      return { key: e.item.key, val: e.item.Payload };
    });
    console.log("Reading 3rd time took", timer4.stop() + "ms");

  } catch(e) {
    console.error("error:", e);
    console.error(e.stack);
    process.exit(1);
  }
}))();

module.exports = run;
