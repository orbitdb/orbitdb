'use strict';

var async       = require('asyncawait/async');
var await       = require('asyncawait/await');
var OrbitClient = require('../src/OrbitClient');
var Timer       = require('./Timer');

var host = 'localhost';
var port = 6379;

var username = process.argv[2] ? process.argv[2] : 'DankoJones';
var password = '';

let run = (async(() => {
  try {
    var orbit = OrbitClient.connect(host, port, username, password);
    const c1 = 'c1';
    let channel;

    let count = 1;
    let id = 'Log: Query '

    setInterval(async(() => {
      if(channel) {
        channel.add(username + " " + count);
        count ++;
      }
    }), process.argv[3] ? process.argv[3] : 1000);

    setInterval(async(() => {
      if(!channel) {
        channel = orbit.channel(c1);
        console.log("subscribed to pubsub topic '" + c1);
        setTimeout(() => {
          if(channel) {
            console.log("leave");
            channel.leave();
            channel = null;
          }
        }, 2000);
      }
    }), 5000);


  } catch(e) {
    console.error("error:", e);
    console.error(e.stack);
    process.exit(1);
  }
}))();

module.exports = run;
