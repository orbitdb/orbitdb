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

    var timer = new Timer(true);

    // Iterator options
    var options = {
      limit: -1, // fetch all
      reverse: false, // latest first
      // gte: <ipfs-hash> // eg. 'QmQGa4Bsw3JxxydNNbbYnXfnW1BC54koTidHQ6Am2VM8Ep'
      // lte: <ipfs-hash> // eg. 'QmQGa4Bsw3JxxydNNbbYnXfnW1BC54koTidHQ6Am2VM8Ep'
    }

    // Get all messages
    var iter = orbit.channel(channel, '').iterator(options);

    for(let i of iter) {
      console.log(i.item.Data.seq, i.item.Data.op, i.hash, "ts: " + i.item.Data.meta.ts, i.item.Payload);
    }

    console.log("Fetch messages took " + timer.stop() + "ms");

  } catch(e) {
    console.error("error:", e);
    console.error(e.stack);
    process.exit(1);
  }
}))();

module.exports = run;
