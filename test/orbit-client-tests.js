// 'use strict';

// var fs          = require('fs');
// var path        = require('path');
// var assert      = require('assert');
// var async       = require('asyncawait/async');
// var await       = require('asyncawait/await');
// var ipfsDaemon  = require('orbit-common/lib/ipfs-daemon');
// var logger      = require('orbit-common/lib/logger');
// var Server      = require('orbit-server/src/server');
// var OrbitClient = require('../src/OrbitClient');

// var serverConfig = {
//   networkId: "orbitdb-test",
//   networkName: "OrbitDB Test Network",
//   salt: "hellothisisdog",
//   userDataPath: "/tmp/orbitdb-tests",
//   verifyMessages: true
// }

// // Orbit
// const host     = 'localhost';
// const port     = 6379;
// const username = 'testrunner';
// const password = '';

// const startServer = async (() => {
//   return new Promise(async((resolve, reject) => {
//     logger.setLevel('ERROR');
//     const ipfsd  = await(ipfsDaemon());
//     const server = Server(ipfsd.daemon, ipfsd.nodeInfo, serverConfig);
//     server.app.listen(port, () => {
//       resolve(server);
//     }).on('error', (err) => {
//       resolve(server);
//     });
//   }));
// });


// describe('Orbit Client', () => {
//   let server, orbit;

//   let head    = '';
//   let items   = [];
//   let channel = 'abcdefgh';

//   before(async((done) => {
//     var initialize = () => new Promise(async((resolve, reject) => {
//       orbit = OrbitClient.connect(host, port, username, password);
//       orbit.channel(channel, '').delete();
//       resolve();
//     }));
//     server = await(startServer());
//     await(initialize());
//     done();
//   }));

//   after(function(done) {
//     var deleteChannel = () => new Promise(async((resolve, reject) => {
//       if(orbit) orbit.channel(channel, '').delete();
//       resolve();
//     }));
//     server.shutdown();
//     server = null;
//     deleteChannel().then(done);
//   });

//   /* TESTS */
//   describe('Connect', function() {
//     it('connects to hash-cache-server', async((done) => {
//       assert.notEqual(orbit, null);
//       // assert.notEqual(orbit.client, null);
//       // assert.equal(orbit.user.id, 'hello');
//       // assert.equal(orbit.network.id, serverConfig.networkId);
//       // assert.equal(orbit.network.name, serverConfig.networkName);
//       // assert.notEqual(orbit.network.config.SupernodeRouting, null);
//       // assert.notEqual(orbit.network.config.Bootstrap.length, 0);
//       done();
//     }));
//   });

//   describe('Info', function() {
//     it('gets channel info on empty channel', async((done) => {
//       var info = orbit.channel(channel, '').info();
//       assert.notEqual(info, null);
//       assert.equal(info.head, null);
//       assert.notEqual(info.modes, null);
//       done();
//     }));

//     it('gets channel info on an existing channel', async((done) => {
//       var msg  = orbit.channel(channel, '').add('hello');
//       var info = orbit.channel(channel, '').info();
//       assert.notEqual(info, null);
//       assert.notEqual(info.head, null);
//       assert.notEqual(info.modes, null);
//       assert.equal(info.modes.r, null);
//       done();
//     }));

//     // it('gets channel info when channel has modes set', async((done) => {
//     //   try {
//     //     orbit.channel(channel).delete();
//     //     var mode = {
//     //       mode: "+r",
//     //       params: {
//     //         password: 'password'
//     //       }
//     //     };
//     //     var res = orbit.channel(channel, '').setMode(mode)
//     //     var info = orbit.channel(channel, 'password').info();
//     //     assert.notEqual(info, null);
//     //     assert.equal(info.head, null);
//     //     assert.equal(JSON.stringify(info.modes), JSON.stringify(res));
//     //     orbit.channel(channel, 'password').delete();
//     //   } catch(e) {
//     //     orbit.channel(channel, 'password').delete();
//     //     assert.equal(e, null);
//     //   }
//     //   done();
//     // }));

//   });

//   describe('Delete', function() {
//     it('deletes a channel from the database', async((done) => {
//       var result = orbit.channel(channel, '').delete();
//       assert.equal(result, true);
//       var iter = orbit.channel(channel, '').iterator();
//       assert.equal(iter.next().value, null);
//       done();
//     }));

//     it('deletes a channel with a password', async((done) => {
//       done();
//     }));

//     it('doesn\'t delete a channel when password is wrong', async((done) => {
//       done();
//     }));

//     it('doesn\'t delete a channel when user is not an op', async((done) => {
//       done();
//     }));
//   });

//   describe('Add events', function() {
//     it('adds an item to an empty channel', async((done) => {
//       try {
//         orbit.channel(channel, '').delete();
//         const head = orbit.channel(channel, '').add('hello');
//         assert.notEqual(head, null);
//         assert.equal(head.startsWith('Qm'), true);
//         assert.equal(head.length, 46);
//       } catch(e) {
//         assert.equal(e, null);
//       }
//       done();
//     }));

//     it('adds a new item to a channel with one item', async((done) => {
//       try {
//         const head = orbit.channel(channel, '').iterator().collect()[0];
//         const second = orbit.channel(channel, '').add('hello');
//         assert.notEqual(second, null);
//         assert.notEqual(second, head);
//         assert.equal(second.startsWith('Qm'), true);
//         assert.equal(second.length, 46);
//       } catch(e) {
//         assert.equal(e, null);
//       }
//       done();
//     }));

//     it('adds five items', async((done) => {
//       for(var i = 0; i < 5; i ++) {
//         try {
//           var s = orbit.channel(channel, '').add('hello');
//           assert.notEqual(s, null);
//           assert.equal(s.startsWith('Qm'), true);
//           assert.equal(s.length, 46);
//         } catch(e) {
//           assert.equal(e, null);
//         }
//       }
//       done();
//     }));

//     it('adds an item that is > 256 bytes', async((done) => {
//       try {
//         var msg = new Buffer(512);
//         msg.fill('a')
//         var s = orbit.channel(channel, '').add(msg.toString());
//         assert.notEqual(s, null);
//         assert.equal(s.startsWith('Qm'), true);
//         assert.equal(s.length, 46);
//       } catch(e) {
//         assert.equal(e, null);
//       }
//       done();
//     }));
//   });


//   describe('Iterator', function() {
//     var items = [];
//     var itemCount = 5;

//     before(function(done) {
//       var addMessages = () => new Promise(async((resolve, reject) => {
//         var result = orbit.channel(channel, '').delete();
//         var iter   = orbit.channel(channel, '').iterator();
//         for(var i = 0; i < itemCount; i ++) {
//           var s = orbit.channel(channel, '').add('hello' + i);
//           items.push(s);
//         }
//         resolve();
//       }));
//       addMessages().then(done);
//     });

//     describe('Defaults', function() {
//       it('returns an iterator', async((done) => {
//         var iter = orbit.channel(channel, '').iterator();
//         var next = iter.next().value;
//         assert.notEqual(iter, null);
//         assert.notEqual(next, null);
//         assert.notEqual(next.item, null);
//         assert.notEqual(next.item.op, null);
//         assert.equal(next.item.seq, 4);
//         assert.notEqual(next.item.target, null);
//         assert.notEqual(next.item.next, null);
//         assert.notEqual(next.item.Payload, null);
//         assert.equal(next.item.Payload, 'hello4');
//         done();
//       }));

//       it('implements Iterator interface', async((done) => {
//         var iter = orbit.channel(channel, '').iterator({ limit: -1 });
//         var messages = [];

//         for(let i of iter)
//           messages.push(i.hash);

//         assert.equal(messages.length, items.length);
//         done();
//       }));

//       it('returns 1 item as default', async((done) => {
//         var iter = orbit.channel(channel, '').iterator();
//         var first = iter.next().value;
//         var second = iter.next().value;
//         assert.equal(first.item.key, items[items.length - 1]);
//         assert.equal(second, null);
//         assert.equal(first.item.Payload, 'hello4');
//         done();
//       }));
//     });

//     describe('Collect', function() {
//       it('returns all items', async((done) => {
//         var iter = orbit.channel(channel, '').iterator({ limit: -1 });
//         var messages = iter.collect();
//         assert.equal(messages.length, items.length);
//         assert.equal(messages[messages.length - 1].item.Payload, 'hello0');
//         assert.equal(messages[0].item.Payload, 'hello4');
//         done();
//       }));

//       it('returns 1 item', async((done) => {
//         var iter = orbit.channel(channel, '').iterator();
//         var messages = iter.collect();
//         assert.equal(messages.length, 1);
//         done();
//       }));

//       it('returns 3 items', async((done) => {
//         var iter = orbit.channel(channel, '').iterator({ limit: 3 });
//         var messages = iter.collect();
//         assert.equal(messages.length, 3);
//         done();
//       }));
//     });

//     describe('Options: limit', function() {
//       it('returns 1 item when limit is 0', async((done) => {
//         var iter = orbit.channel(channel, '').iterator({ limit: 0 });
//         var first = iter.next().value;
//         var second = iter.next().value;
//         assert.equal(first.item.key, items[items.length - 1]);
//         assert.equal(second, null);
//         done();
//       }));

//       it('returns 1 item when limit is 1', async((done) => {
//         var iter = orbit.channel(channel, '').iterator({ limit: 1 });
//         var first = iter.next().value;
//         var second = iter.next().value;
//         assert.equal(first.item.key, items[items.length - 1]);
//         assert.equal(second, null);
//         done();
//       }));

//       it('returns 3 items', async((done) => {
//         var iter = orbit.channel(channel, '').iterator({ limit: 3 });
//         var first = iter.next().value;
//         var second = iter.next().value;
//         var third = iter.next().value;
//         var fourth = iter.next().value;
//         assert.equal(first.item.key, items[items.length - 1]);
//         assert.equal(second.item.key, items[items.length - 2]);
//         assert.equal(third.item.key, items[items.length - 3]);
//         assert.equal(fourth, null);
//         done();
//       }));

//       it('returns all items', async((done) => {
//         var iter = orbit.channel(channel, '').iterator({ limit: -1 });
//         var messages = iter.collect().map((e) => e.item.key);

//         messages.reverse();
//         assert.equal(messages.length, items.length);
//         assert.equal(messages[0], items[0]);
//         done();
//       }));

//       it('returns all items when limit is bigger than -1', async((done) => {
//         var iter = orbit.channel(channel, '').iterator({ limit: -300 });
//         var messages = iter.collect().map((e) => e.item.key);

//         assert.equal(messages.length, items.length);
//         assert.equal(messages[0], items[items.length - 1]);
//         done();
//       }));

//       it('returns all items when limit is bigger than number of items', async((done) => {
//         var iter = orbit.channel(channel, '').iterator({ limit: 300 });
//         var messages = iter.collect().map((e) => e.item.key);

//         assert.equal(messages.length, items.length);
//         assert.equal(messages[0], items[items.length - 1]);
//         done();
//       }));
//     });

//     describe('Options: reverse', function() {
//       it('returns all items reversed', async((done) => {
//         var iter = orbit.channel(channel, '').iterator({ limit: -1, reverse: true });
//         var messages = iter.collect().map((e) => e.item.key);

//         assert.equal(messages.length, items.length);
//         assert.equal(messages[0], items[0]);
//         done();
//       }));
//     });

//     describe('Options: ranges', function() {
//       var all = [];
//       var head;

//       before((done) => {
//         var fetchAll = () => new Promise(async((resolve, reject) => {
//           all = orbit.channel(channel, '').iterator({ limit: -1 }).collect();
//           head = all[0];
//           resolve();
//         }));
//         fetchAll().then(done);
//       });

//       describe('gt & gte', function() {
//         it('returns 0 items when gt is the head', async((done) => {
//           var messages = orbit.channel(channel, '').iterator({ gt: head.hash }).collect();
//           assert.equal(messages.length, 0);
//           done();
//         }));

//         it('returns 1 item when gte is the head', async((done) => {
//           var iter2 = orbit.channel(channel, '').iterator({ gte: head.hash, limit: -1 });
//           var messages = iter2.collect().map((e) => e.item.key);

//           assert.equal(messages.length, 1);
//           assert.equal(messages[0], items[items.length -1]);
//           done();
//         }));

//         it('returns 2 item when gte is defined', async((done) => {
//           var gte = all[1].hash;
//           var iter = orbit.channel(channel, '').iterator({ gte: gte, limit: -1 });
//           var messages = iter.collect().map((e) => e.hash);

//           // console.log(messages, all)
//           assert.equal(messages.length, 2);
//           assert.equal(messages[0], all[0].hash);
//           assert.equal(messages[1], all[1].hash);
//           done();
//         }));

//         it('returns all items when gte is the root item', async((done) => {
//           var iter = orbit.channel(channel, '').iterator({ gte: all[all.length -1], limit: -1 });
//           var messages = iter.collect().map((e) => e.item.key);

//           assert.equal(messages.length, itemCount);
//           assert.equal(messages[0], items[items.length - 1]);
//           assert.equal(messages[messages.length - 1], items[0]);
//           done();
//         }));

//         it('returns items when gt is the root item', async((done) => {
//           var iter = orbit.channel(channel, '').iterator({ gt: all[all.length - 1], limit: -1 });
//           var messages = iter.collect().map((e) => e.item.key);

//           assert.equal(messages.length, itemCount - 1);
//           assert.equal(messages[0], items[items.length - 1]);
//           assert.equal(messages[3], items[1]);
//           done();
//         }));

//         it('returns items when gt is defined', async((done) => {
//           var iter = orbit.channel(channel, '').iterator({ limit: -1});
//           var messages = iter.collect().map((e) => e.hash);

//           var gt = messages[2];
//           var iter2 = orbit.channel(channel, '').iterator({ gt: gt, limit: 100 });
//           var messages2 = iter2.collect().map((e) => e.hash);

//           assert.equal(messages2.length, 2);
//           assert.equal(messages2[0], messages[0]);
//           assert.equal(messages2[1], messages[1]);
//           done();
//         }));
//       });

//       describe('lt & lte', function() {
//         it('returns one item when lt is the head', async((done) => {
//           var iter2 = orbit.channel(channel, '').iterator({ lt: head.hash });
//           var messages = iter2.collect().map((e) => e.hash);

//           assert.equal(messages.length, 1);
//           assert.equal(messages[0], head.hash);
//           done();
//         }));

//         it('returns all items when lt is head and limit is -1', async((done) => {
//           var iter2 = orbit.channel(channel, '').iterator({ lt: head.hash, limit: -1 });
//           var messages = iter2.collect().map((e) => e.hash);

//           assert.equal(messages.length, itemCount);
//           assert.equal(messages[0], head.hash);
//           assert.equal(messages[4], all[all.length - 1].hash);
//           done();
//         }));

//         it('returns 3 items when lt is head and limit is 3', async((done) => {
//           var iter2 = orbit.channel(channel, '').iterator({ lt: head.hash, limit: 3 });
//           var messages = iter2.collect().map((e) => e.hash);

//           assert.equal(messages.length, 3);
//           assert.equal(messages[0], head.hash);
//           assert.equal(messages[2], all[2].hash);
//           done();
//         }));

//         it('returns null when lt is the root item', async((done) => {
//           var messages = orbit.channel(channel, '').iterator({ lt: all[all.length - 1].hash }).collect();
//           assert.equal(messages.length, 0);
//           done();
//         }));

//         it('returns one item when lte is the root item', async((done) => {
//           var iter = orbit.channel(channel, '').iterator({ lte: all[all.length - 1].hash });
//           var messages = iter.collect().map((e) => e.hash);

//           assert.equal(messages.length, 1);
//           assert.equal(messages[0], all[all.length - 1].hash);
//           done();
//         }));

//         it('returns all items when lte is the head', async((done) => {
//           var iter2 = orbit.channel(channel, '').iterator({ lte: head.hash, limit: -1 });
//           var messages = iter2.collect().map((e) => e.hash);

//           assert.equal(messages.length, itemCount);
//           assert.equal(messages[0], all[0].hash);
//           assert.equal(messages[4], all[all.length - 1].hash);
//           done();
//         }));

//         it('returns 3 items when lte is the head', async((done) => {
//           var iter2 = orbit.channel(channel, '').iterator({ lte: head.hash, limit: 3 });
//           var messages = iter2.collect().map((e) => e.hash);

//           assert.equal(messages.length, 3);
//           assert.equal(messages[0], all[0].hash);
//           assert.equal(messages[1], all[1].hash);
//           assert.equal(messages[2], all[2].hash);
//           done();
//         }));
//       });
//     });

//   });


// /*
//   describe('Modes', function() {
//     var password = 'hello';

//     it('sets read mode', async((done) => {
//       try {
//         var mode = {
//           mode: "+r",
//           params: {
//             password: password
//           }
//         };
//         var modes = orbit.channel(channel, '').setMode(mode)
//         assert.notEqual(modes.r, null);
//         assert.equal(modes.r.password, password);
//       } catch(e) {
//         assert.equal(e, null);
//       }
//       done();
//     }));

//     it('can\'t read with wrong password', async((done) => {
//       try {
//         var modes = orbit.channel(channel, 'invalidpassword').iterator();
//         assert.equal(true, false);
//       } catch(e) {
//         assert.equal(e, 'Unauthorized');
//       }
//       done();
//     }));

//     it('sets write mode', async((done) => {
//       try {
//         var mode = {
//           mode: "+w",
//           params: {
//             ops: [orbit.user.id]
//           }
//         };
//         var modes = orbit.channel(channel, password).setMode(mode);
//         assert.notEqual(modes.w, null);
//         assert.equal(modes.w.ops[0], orbit.user.id);
//       } catch(e) {
//         assert.equal(e, null);
//       }
//       done();
//     }));

//     it('can\'t write when user not an op', async((done) => {
//       // TODO
//       done();
//     }));

//     it('removes write mode', async((done) => {
//       try {
//         var modes = orbit.channel(channel, password).setMode({ mode: "-w" });
//         assert.equal(modes.w, null);
//       } catch(e) {
//         assert.equal(e, null);
//       }
//       done();
//     }));

//     it('removes read mode', async((done) => {
//       try {
//         var modes = orbit.channel(channel, password).setMode({ mode: "-r" });
//         assert.equal(modes.r, null);
//       } catch(e) {
//         assert.equal(e, null);
//       }
//       done();
//     }));

//   });
// */
// });
