'use strict';

const _ = require('lodash');
const Timer = require('./examples/Timer');
const List = require('./src/list/List');
// const Node = require('./src/list/Node');

var run = () => {
  var redis = require("redis");
  this.client1 = redis.createClient({ host: "localhost", port: 6379 });
  this.client2 = redis.createClient({ host: "localhost", port: 6379 });
  var hash = "ccc"
  this.client1.subscribe(hash);
  this.client1.subscribe(hash);


  let listA = new List("A");
  let listB = new List("B");
  let listC = new List("C");

  const handleMessage = (hash, event) => {
    const l = List.fromJson(JSON.parse(event));
    // console.log("LIST", l);

    if(l.id === 'A') {
      listB.join(l);
      listC.join(l);
    } else if(l.id === 'B') {
      listA.join(l);
      listC.join(l);
    } else if(l.id === 'C') {
      listA.join(l);
      console.log("Items:", listA.items.length);
      // console.log(JSON.stringify(listA, null, 1));
    }

  }

  this.client1.on("message", handleMessage);
  this.client2.on("message", handleMessage);

  let h = 0;
  setInterval(() => {
    listC.add("C--"+h);
    this.client2.publish(hash, JSON.stringify(listC.toJson()));
    h++;
  }, 1000);

  let i = 0;
  setInterval(() => {
    let a = 0;
    for(let a = 0; a < 10; a ++) {
      listB.add("B--"+(i+a));
    }
    this.client2.publish(hash, JSON.stringify(listB.toJson()));
    i++;
  }, 20);

  let k = 0;
  setInterval(() => {
    listA.add("A--"+k);
    k++;
    listA.add("A--"+k);
    k++;
    listA.add("A--"+k);
    k++;
    this.client2.publish(hash, JSON.stringify(listA.toJson()));
  }, 100);
};

run();
