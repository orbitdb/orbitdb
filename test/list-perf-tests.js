// 'use strict';

// const assert     = require('assert');
// const async      = require('asyncawait/async');
// const await      = require('asyncawait/await');
// const ipfsDaemon = require('orbit-common/lib/ipfs-daemon');
// const ipfsAPI    = require('orbit-common/lib/ipfs-api-promised');
// const List       = require('../src/list/List');
// const OrbitList  = require('../src/list/OrbitList');
// const Timer      = require('../examples/Timer');


// describe('List - Performance Measurement', function() {
//   this.timeout(60000);

//   it('add', (done) => {
//     let ms = 0;

//     for(let t = 1000; t <= 5000; t += 1000) {
//       const list = new List('A');
//       let timer = new Timer(true);

//       for(let i = 0; i < t; i ++) {
//         list.add("hello" + i);
//       }

//       ms = timer.stop(true);
//       console.log(`    > ${t} took ${ms} ms`)
//     }

//     assert.equal(true, true);
//     done();
//   });

// });

// describe('OrbitList - Performance Measurement', function() {
//   const startIpfs = async (() => {
//     return new Promise(async((resolve, reject) => {
//       const ipfsd  = await(ipfsDaemon());
//       resolve(ipfsd.daemon);
//     }));
//   });

//   let ipfs;

//   this.timeout(60000);

//   before(async((done) => {
//     ipfs = await(startIpfs());
//     done();
//   }));

//   it('add', async((done) => {
//     let ms = 0;

//     for(let t = 100; t <= 1000; t += 300) {
//       const list = new OrbitList('A', ipfs);
//       let timer = new Timer(true);

//       for(let i = 0; i < t; i ++) {
//         list.add("hello" + i);
//       }

//       ms = timer.stop(true);
//       console.log(`    > ${t} took ${ms} ms`)
//     }

//     assert.equal(true, true);
//     done();
//   }));

// });
