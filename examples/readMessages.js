'use strict';

var async       = require('asyncawait/async');
var OrbitClient = require('../src/OrbitClient');
var Timer       = require('./Timer');

var host     = 'localhost:3006';
var username = 'testrunner';
var password = '';

var util = require('util');
var exec = require('child_process').exec;

function clear(cb){
    exec('clear', function(error, stdout, stderr){
        util.puts(stdout);
        cb();
    });
}

let run = (async(() => {
  try {
    // Connect
    var orbit = OrbitClient.connect(host, username, password);

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
    const id = 'a';
    const c1 = 'c1';
    const cc = orbit.channel(c1);

    let i = 0;
    let running = false;
    let missCount = 0;
    setInterval(async(() => {
      if(!running) {
        let timer = new Timer(true);
        running = true;
        // orbit.channel(c1).add("hello at #" + i);
        cc.add(id + i);
        i ++;
        console.log(`Insert took ${timer.stop(true)} ms`);

        let timer2 = new Timer(true);
        var items = cc.iterator({ limit: 10 }).collect();
        console.log("Iterator took " + timer2.stop(true) + " ms");
        items = items.map((e) => {
          return e.item;
        });

        var g = items.filter((e) => e.Payload.startsWith(id))
        var prev = -1;
        g.reverse().forEach((e) => {
          var a = parseInt(e.Payload.replace(id, ''));
          if(prev > -1 && prev + 1 !== a) {
            console.log("Missing message: " + id, prev + 1)
          }
          prev = a;
        })
        console.log(JSON.stringify(items.map((e) => e.seq + " - " + e.Payload), null, 2));
        // console.log("\n\n");
        running = false;
      }
    }), 50);
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
