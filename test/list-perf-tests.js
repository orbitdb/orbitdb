// 'use strict';

// var assert = require('assert');
// var async  = require('asyncawait/async');
// var await  = require('asyncawait/await');
// var List   = require('../src/list/List');
// var Timer  = require('../examples/Timer');

// describe('List - Performance Measurement', function() {
//   this.timeout(60000);

//   it('add', (done) => {
//     let ms = 0;

//     for(let t = 1000; t <= 10000; t += 1000) {
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
