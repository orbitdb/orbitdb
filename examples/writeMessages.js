'use strict';

var async       = require('asyncawait/async');
var await       = require('asyncawait/await');
var OrbitClient = require('../src/OrbitClient');
var Timer       = require('./Timer');

var host     = 'localhost';
var port     = 6379;

var username = 'LambOfGod';
var password = '';

let run = (async(() => {
  try {
/*    var channel = 'hello-world-test1'

    // Connect
    var orbit = OrbitClient.connect(host, username, password);

    // Delete channel and its data
    var result = orbit.channel(channel, '').delete();

    // Add the first message and delete it immediately
    // orbit.channel(channel, '').put("hello world!");
    // var e = orbit.channel(channel, '').iterator({ limit: -1 }).collect()[0].hash;
    // orbit.channel(channel, '').del(e);
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
        // orbit.channel(channel, '').del(head);
      }

      i ++;
    }

    var items = orbit.channel(channel, '').iterator({ limit: -1 }).collect();
    // console.log(items);
    var e = orbit.channel(channel, '').iterator({ limit: -1 }).collect();
    orbit.channel(channel, '').del({ key: "key one" });
    // orbit.channel(channel, '').del(items[2].hash); // 97
    // orbit.channel(channel, '').del(items[3].hash); // 96
    // orbit.channel(channel, '').del(items[66].hash); // 34
    // orbit.channel(channel, '').del(items[items.length - 10].hash); // 11
    // orbit.channel(channel, '').del(items[items.length - 9].hash); // 10
    // orbit.channel(channel, '').del(items[items.length - 8].hash); // 9
*/

  var orbit = OrbitClient.connect(host, port, username, password);
  const c1 = 'c1';
  const cc = orbit.channel(c1);

  let i = 1;
  let id = 'b'
  let running = false;
  setInterval(async(() => {
    if(!running) {
      let timer = new Timer(true);
      running = true;

      await(cc.add(id + i));

      let items = cc.iterator({ limit: 10 }).collect();

        var g = items.filter((e) => e.item.Payload.startsWith(id))
        var prev = -1;
        g.reverse().forEach((e) => {
          var a = parseInt(e.item.Payload.replace(id, ''));
          if(prev > -1 && prev + 1 !== a) {
            console.log("MISSSS!!!", prev + 1, items)
            process.exit(1);
          }
          prev = a;
        })

      items = items.map((e) => {
        return e.item.seq + " - " + e.item.Payload;
      });
      console.log(JSON.stringify(items, null, 2));
      console.log(`Query ${i} took ${timer.stop(true)} ms`);
      running = false;
      i ++;
    }
  // while(true) {
  // }
  }), 1000);

  // setInterval(async(() => {
  //   if(!running) {
  //     let timer = new Timer(true);
  //     running = true;

  //     await(cc.add(id + i));

  //     let items = cc.iterator({ limit: 10 }).collect();

  //       var g = items.filter((e) => e.item.Payload.startsWith(id))
  //       var prev = -1;
  //       g.reverse().forEach((e) => {
  //         var a = parseInt(e.item.Payload.replace(id, ''));
  //         if(prev > -1 && prev + 1 !== a) {
  //           console.log("MISSSS!!!", prev + 1, items)
  //           process.exit(1);
  //         }
  //         prev = a;
  //       })

  //     items = items.map((e) => {
  //       return e.item.seq + " - " + e.item.Payload;
  //     });
  //     console.log(JSON.stringify(items, null, 2));
  //     console.log(`Query took ${timer.stop(true)} ms`);
  //     running = false;
  //     i ++;
  //   }
  // }), 36);

  } catch(e) {
    console.error("error:", e);
    console.error(e.stack);
    process.exit(1);
  }
}))();

module.exports = run;
