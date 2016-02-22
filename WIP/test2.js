'use strict';

const _          = require('lodash');
const async      = require('asyncawait/async');
const await      = require('asyncawait/await');
const ipfsDaemon = require('orbit-common/lib/ipfs-daemon');
const ipfsAPI    = require('orbit-common/lib/ipfs-api-promised');
const List       = require('./src/list/OrbitList');
const Timer      = require('./examples/Timer');

const startIpfs = async (() => {
  return new Promise(async((resolve, reject) => {
    const ipfsd  = await(ipfsDaemon());
    resolve(ipfsd.daemon);
  }));
});

let ipfs;

var run = async(() => {
  ipfs = await(startIpfs());

  var redis = require("redis");
  this.client1 = redis.createClient({ host: "localhost", port: 6379 });
  this.client2 = redis.createClient({ host: "localhost", port: 6379 });
  var hash = "ccc"
  this.client1.subscribe(hash);
  this.client1.subscribe(hash);


  let listA = new List("A", ipfs);
  let listB = new List("B", ipfs);
  let listC = new List("C", ipfs);

  const handleMessage = async((hash, event) => {
    // const l = List.fromJson(JSON.parse(event));
    console.log(">", event);
    const l = await(List.fromIpfsHash(ipfs, event));
    // console.log("ITEMS RECEIVED", l.items.length);

    if(l.id === 'A') {
      listB.join(l);
      listC.join(l);
    } else if(l.id === 'B') {
      // listA.join(l);
      // listC.join(l);
    } else if(l.id === 'C') {
      listB.join(l);
      var timer = new Timer('a');
      listC.join(listB);
      console.log("join took " + timer.stop(true) + " ms");
      console.log("Items:", listC.items.length);
      // console.log(listC.toString());
    }
  });

  this.client1.on("message", handleMessage);
  this.client2.on("message", handleMessage);

  let h = 0;
  setInterval(async(() => {
    listC.add("C--"+h);
    const list = await(listC.getIpfsHash());
    this.client2.publish(hash, list);
    h++;
  }), 1000);

  let i = 0;
  setInterval(async(() => {
    let a = 0;
    // for(let a = 0; a < 10; a ++) {
      listB.add("B--"+(i+a));
    // }
    const list = await(listB.getIpfsHash());
    this.client2.publish(hash, list);
    i++;
  }), 50);

//   let k = 0;
//   setInterval(async(() => {
//     listA.add("A--"+k);
//     k++;
//     listA.add("A--"+k);
//     k++;
//     listA.add("A--"+k);
//     k++;
//     this.client2.publish(hash, JSON.stringify(listA.toJson()));
//   }), 100);
// });
});

run();
