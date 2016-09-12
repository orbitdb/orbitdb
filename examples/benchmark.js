'use strict';

// const ipfsd   = require('ipfsd-ctl');
// const IPFS    = require('ipfs')
// const ipfsd   = require('ipfsd-ctl');
const IpfsApi = require('ipfs-api')
const OrbitDB = require('../src/OrbitDB');
const Timer   = require('./Timer');

// usage: benchmark.js <network hash> <username> <channel>;

// orbit-server
const network = 'localhost:3333';
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
    // const ipfs = new IPFS('/tmp/benchmark')
    // ipfs.goOnline(() => {
    //   resolve(ipfs)
    // })
  });
};

const util = require('util');

// Metrics
let totalQueries = 0;
let seconds = 0;
let queriesPerSecond = 0;
let lastTenSeconds = 0;

const queryLoop = (db) => {
  // let timer = new Timer();
  // timer.start();
  db.add(username + totalQueries).then(() => {
    // console.log(`${timer.stop(true)} ms - ${process._getActiveRequests().length} ${process._getActiveHandles().length}`);
    // console.log(util.inspect(process.memoryUsage()));
    totalQueries ++;
    lastTenSeconds ++;
    queriesPerSecond ++;
    process.nextTick(() => queryLoop(db))
  });
};

let run = (() => {
    // Connect
    console.log(`Connecting...`)
    const ipfs = IpfsApi('localhost', '5002')
    const orbit = new OrbitDB(ipfs, 'benchmark')
    const db = orbit.eventlog(channelName)

    // Metrics output
    setInterval(() => {
      seconds ++;
      if(seconds % 10 === 0) {
        console.log(`--> Average of ${lastTenSeconds/10} q/s in the last 10 seconds`);
        if(lastTenSeconds === 0)
          throw new Error("Problems!");
        lastTenSeconds = 0;
      }
      console.log(`${queriesPerSecond} queries per second, ${totalQueries} queries in ${seconds} seconds`);
      queriesPerSecond = 0;
    }, 1000);

    // Start
    queryLoop(db);
})();

module.exports = run;
