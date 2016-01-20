'use strict';

var async       = require('asyncawait/async');
var OrbitClient = require('../src/OrbitClient');
var Timer       = require('../src/Timer');

var host     = 'localhost:3006';
var username = 'testrunner';
var password = '';

let run = (async(() => {
  try {
    var channel = 'hello-world-test1'

    // Connect
    var orbit = OrbitClient.connect(host, username, password);

    // Delete channel and its data
    var result = orbit.channel(channel, '').delete();

    // Add the first message and delete it immediately
    // orbit.channel(channel, '').put("hello world!");
    // var e = orbit.channel(channel, '').iterator({ limit: -1 }).collect()[0].hash;
    // orbit.channel(channel, '').remove(e);
    orbit.channel(channel, '').put("key two", "hello world!!!");

    var messages = 10;
    var i = 1;
    while(i <= messages) {
      var timer = new Timer(true);
      // Send a message
      // var head = orbit.channel(channel, '').send(JSON.stringify({ omg: "hello" }));
      var head = orbit.channel(channel, '').put("key one", "hello world " + i);
      console.log(i, head, timer.stop() + "ms");

      if(i === 4) {
        console.log("remove", head);
        // orbit.channel(channel, '').remove(head);
      }

      i ++;
    }

    var items = orbit.channel(channel, '').iterator({ limit: -1 }).collect();
    // console.log(items);
    var e = orbit.channel(channel, '').iterator({ limit: -1 }).collect();
    orbit.channel(channel, '').remove({ key: "key one" });
    // orbit.channel(channel, '').remove(items[2].hash); // 97
    // orbit.channel(channel, '').remove(items[3].hash); // 96
    // orbit.channel(channel, '').remove(items[66].hash); // 34
    // orbit.channel(channel, '').remove(items[items.length - 10].hash); // 11
    // orbit.channel(channel, '').remove(items[items.length - 9].hash); // 10
    // orbit.channel(channel, '').remove(items[items.length - 8].hash); // 9

  } catch(e) {
    console.error("error:", e);
    console.error(e.stack);
    process.exit(1);
  }
}))();

module.exports = run;
