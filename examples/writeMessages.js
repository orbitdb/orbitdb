'use strict';

var async       = require('asyncawait/async');
var OrbitClient = require('../OrbitClient');
var Timer       = require('../Timer');

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

    var messages = 100;
    var i = 0;
    while(i < messages) {
      var timer = new Timer(true);
      // Send a message
      var head = orbit.channel(channel, '').send('hello');
      console.log(i, head, timer.stop() + "ms");
      i ++;
    }

  } catch(e) {
    console.error("error:", e);
    console.error(e.stack);
    process.exit(1);
  }
}))();

module.exports = run;
