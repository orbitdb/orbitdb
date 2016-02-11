'use strict';

var async       = require('asyncawait/async');
var await       = require('asyncawait/await');
var OrbitClient = require('../src/OrbitClient');
var Timer       = require('./Timer');

var host     = '178.62.229.175';
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
        let timer = new Timer(true);
        running = true;

        channel.add(id + count);

        console.log("Query...");
        let items = channel.iterator({ limit: 3 }).collect();
        console.log(`Found items ${items.length} items`);

        var g = items.filter((e) => e.item.Payload.startsWith(id))
        var prev = -1;
        g.reverse().forEach((e) => {
          var a = parseInt(e.item.Payload.replace(id, ''));
          if(prev > -1 && prev + 1 !== a) {
            console.log("MISSING VALUE!!!", prev + 1, items)
            process.exit(1);
          }
          prev = a;
        })

        items = items.map((e) => {
          return e.item.seq + " | " + e.item.Payload;
        });

        console.log("---------------------------------------------------")
        console.log("Seq | Payload")
        console.log("---------------------------------------------------")
        console.log(items.join("\n"));
        console.log("---------------------------------------------------")
        console.log(`Query #${count} took ${timer.stop(true)} ms\n`);

        running = false;
        count ++;
      }
    }), 1000);

  } catch(e) {
    console.error("error:", e);
    console.error(e.stack);
    process.exit(1);
  }
}))();

module.exports = run;
