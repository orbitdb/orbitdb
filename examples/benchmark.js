'use strict';

const ipfsd   = require('ipfsd-ctl');
const OrbitDB = require('../src/OrbitDB');
const Timer   = require('./Timer');

// usage: benchmark.js <network hash> <username> <channel>;

// orbit-server
// const network = 'QmRB8x6aErtKTFHDNRiViixSKYwW1DbfcvJHaZy1hnRzLM'; // dev server
const network = 'QmYPobvobKsyoCKTw476yTui611XABf927KxUPCf4gRLRr'; // 'localhost:3333'
const username = process.argv[2] ? process.argv[2] : 'testrunner';
const password = '';
const channelName = process.argv[3] ? process.argv[3] : 'c1';

const startIpfs = () => {
  return new Promise((resolve, reject) => {
    // ipfsd.disposableApi((err, ipfs) => {
    //   if(err) console.error(err);
    //   resolve(ipfs);
    // });
    ipfsd.local((err, node) => {
      if(err) reject(err);
      node.startDaemon((err, ipfs) => {
        if(err) reject(err);
        resolve(ipfs);
      });
    });
  });
};

let run = (() => {
    // Metrics
    let totalQueries = 0;
    let seconds = 0;
    let queriesPerSecond = 0;
    let lastTenSeconds = 0;

    const queryLoop = (db) => {
      db.add(username + totalQueries).then(() => {
        totalQueries ++;
        lastTenSeconds ++;
        queriesPerSecond ++;
        process.nextTick(() => queryLoop(db));
      });
    };

    // Connect
    console.log(`Connecting...`)
    startIpfs()
      .then((ipfs) => OrbitDB.connect(network, username, password, ipfs))
      .then((orbit) => orbit.eventlog(channelName))
      .then(queryLoop)
      .then(() => {
        // Metrics output
        setInterval(() => {
          seconds ++;
          if(seconds % 10 === 0) {
            console.log(`--> Average of ${lastTenSeconds/10} q/s in the last 10 seconds`)
            if(lastTenSeconds === 0)
              throw new Error("Problems!");
            lastTenSeconds = 0
          }
          console.log(`${queriesPerSecond} queries per second, ${totalQueries} queries in ${seconds} seconds`)
          queriesPerSecond = 0;
        }, 1000);
      })
      .catch((e) => {
        console.error("error:", e);
        console.error(e.stack);
        process.exit(1);
      })
})();

module.exports = run;
