'use strict';

var async       = require('asyncawait/async');
var OrbitClient = require('../src/OrbitClient');
var Timer       = require('./Timer');

// Redis host
var host     = 'localhost';
var port     = '6379'

var username = 'testrunner';
var password = '';

var util = require('util');
var exec = require('child_process').exec;

let run = (async(() => {
  try {
    // Connect
    var orbit = OrbitClient.connect(host, port, username, password);

/*    var timer = new Timer(true);

    console.log("-------- KV store -------")
    var channel = 'keyspace1'
    // orbit.channel(channel, '').delete();
    orbit.channel(channel).put("key3", "this is the value you're looking for: " + new Date().getTime());
    var val = orbit.channel(channel).get("key3");
    console.log("key3:", val);

    orbit.channel(channel).put("key4", "this will be deleted");
    var val2 = orbit.channel(channel).get("key4");
    console.log("key4:", val2);
    orbit.channel(channel).remove({ key: "key4" });
    val2 = orbit.channel(channel).get("key4");
    console.log("key4:", val2);

    console.log("-------- EVENT log -------")
    const c1 = 'c1';
    orbit.channel(c1).delete();
    var hash1 = orbit.channel(c1).add("hello1");
    var hash2 = orbit.channel(c1).add("hello2");

    var items = orbit.channel(c1).iterator({ limit: -1 }).collect();
    items = items.map((e) => {
      return { key: e.item.key, val: e.item.Payload };
    });
    console.log(JSON.stringify(items, null, 2));

    // console.log("--> remove", hash1);
    // orbit.channel(c1).remove({ key: hash1 });

    items = orbit.channel(c1).iterator({ limit: -1 }).collect();
    items = items.map((e) => {
      return { key: e.item.key, val: e.item.Payload };
    });
    console.log(JSON.stringify(items, null, 2));
*/
    const id = process.argv[2] ? process.argv[2] : 'a';
    const c1 = 'c1';
    const cc = orbit.channel(c1);

    let i = 0;
    let seconds = 0;
    let round = 0;
    let lastTen = 0;

    // Metrics
    setInterval(() => {
      seconds ++;

      if(seconds % 10 === 0) {
        console.log(`--> Average of ${lastTen/10} q/s in the last 10 seconds`)
        lastTen = 0
      }

      console.log(`${round} queries per second, ${i} queries in ${seconds} seconds`)
      round = 0;
    }, 1000);

    while(true) {
      cc.add(id + i);

      i ++;
      lastTen ++;
      round ++;

      // let items = cc.iterator({ limit: 10 }).collect();
      // items     = items.map((e) => e.item);
      // let g     = items.filter((e) => e.Payload.startsWith(id))
      // let prev  = -1;
      // g.reverse().forEach((e) => {
      //   const a = parseInt(e.Payload.replace(id, ''));
      //   if(prev > -1 && prev + 1 !== a) {
      //     console.log("!! Missing message: " + id, prev + 1)
      //     process.exit(1);
      //   }
      //   prev = a;
      // })
    }

/*
    // You can also get the event based on its hash
    var value = orbit.channel(c1).get(hash2);
    console.log("key:", hash2, "value:", value);
*/
    // console.log("--> remove", hash2);
    // orbit.channel(c1).remove({ key: hash2 });

    // items = orbit.channel(c1).iterator({ limit: -1 }).collect();
    // console.log(JSON.stringify(items, null, 2));

    // process.exit(0);

  } catch(e) {
    console.error("error:", e);
    console.error(e.stack);
    process.exit(1);
  }
}))();

module.exports = run;
