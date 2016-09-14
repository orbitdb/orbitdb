// 'use strict';

// const assert      = require('assert');
// const path        = require('path');
// const fs          = require('fs');
// const Promise     = require('bluebird');
// const rimraf      = require('rimraf')
// const OrbitDB     = require('../src/OrbitDB');
// const ipfsd       = require('ipfsd-ctl');
// // const IPFS        = require('ipfs')

// // Mute logging
// require('logplease').setLogLevel('ERROR');

// const username  = 'testrunner';
// const username2 = 'rennurtset';
// const ipfsPath  = '/tmp/orbittests';
// const cacheFile = path.join(process.cwd(), '/test/orbit-db-cache.json')

// const IpfsApis = [
// // {
// //   // js-ipfs
// //   name: 'js-ipfs',
// //   start: () => {
// //     return new Promise((resolve, reject) => {
// //       const IPFS = require('ipfs')
// //       const ipfs = new IPFS('/tmp/orbit-db-test');
// //       const init = () => {
// //         return new Promise((resolve, reject) => {
// //           ipfs.init({}, (err) => {
// //             if (err) {
// //               if (err.message === 'repo already exists') {
// //                 return resolve();
// //               }
// //               return reject(err);
// //             }
// //             resolve();
// //           });
// //         });
// //       };

// //       // resolve(ipfs);
// //       return init().then(() => {
// //         // resolve(ipfs);
// //         ipfs.goOnline((err) => {
// //           if(err) reject(err)
// //           return resolve(ipfs)
// //         });
// //       });
// //     });
// //   },
// //   // stop: () => Promise.resolve()
// //   stop: () => new Promise((resolve, reject) => ipfs.goOffline(resolve))
// // },
// {
//   // js-ipfs-api via local daemon
//   name: 'js-ipfs-api',
//   start: () => {
//     return new Promise((resolve, reject) => {
//       ipfsd.disposableApi({ repoPath: '/tmp/1' }, (err, ipfs1) => {
//         if(err) reject(err);
//         ipfsd.disposableApi({ repoPath: '/tmp/2' }, (err, ipfs2) => {
//           if(err) reject(err);
//           resolve([ipfs1, ipfs2]);
//         })
//       });
//       // ipfsd.local((err, node) => {
//       //   if(err) reject(err);
//       //   ipfsDaemon = node;
//       //   ipfsDaemon.startDaemon((err, ipfs) => {
//       //     if(err) reject(err);
//       //     resolve(ipfs);
//       //   });
//       // });
//     });
//   },
//   stop: () => Promise.resolve()
//   // stop: () => new Promise((resolve, reject) => ipfsDaemon.stopDaemon(resolve))
// }
// ];

// IpfsApis.forEach(function(ipfsApi) {
//   let ipfs, ipfsDaemon;

//   describe('CounterStore with ' + ipfsApi.name, function() {
//     this.timeout(40000);
//     let client1, client2;

//     before((done) => {
//       rimraf.sync('./orbit-db-cache.json')
//       ipfsApi.start()
//         // .then((ipfs) => {
//         //   return ipfs.add(path.resolve(process.cwd(), './test/network.json')).then(() => ipfs)
//         // })
//         .then((res) => {
//           ipfs = res
//           return
//           // return Promise.map([username, username2], (login, i) => {
//           //   return new OrbitDB(ipfs[i], login, { cacheFile: cacheFile })
//           // }).then((clients) => {
//           //   // client1 = clients[0];
//           //   // client2 = clients[1];
//           //   return;
//           // }).catch((e) => {
//           //   console.log(e.stack);
//           //   assert.equal(e, null);
//           // });
//         })
//         .then(done)
//     })

//     after((done) => {
//       ipfsApi.stop().then(() => {
//         rimraf(cacheFile, () => {
//           rimraf('/tmp/1', () => {
//             rimraf('/tmp/2', done)
//           })
//         })
//       });
//     });

//     beforeEach(() => {
//       client1 = new OrbitDB(ipfs[0], username, { cacheFile: cacheFile })
//       client2 = new OrbitDB(ipfs[1], username2, { cacheFile: cacheFile })
//     });

//     afterEach(() => {
//       if(client1) client1.disconnect()
//       if(client2) client2.disconnect()
//     })

//     describe('counters', function() {
//       it('increases a counter value', function(done) {
//         const timeout = setTimeout(() => done(new Error('event was not fired')), 2000)
//         const counter = client1.counter('counter test', { subscribe: false, cacheFile: cacheFile })
//         counter.events.on('ready', () => {
//           Promise.map([13, 1], (f) => counter.inc(f), { concurrency: 1 })
//             .then(() => {
//               assert.equal(counter.value(), 14)
//               clearTimeout(timeout)
//               client1.disconnect()
//               done()
//             })
//             .catch(done)
//         })
//       });

//       it('creates a new counter from cached data', function(done) {
//         const timeout = setTimeout(() => done(new Error('event was not fired')), 2000)
//         const counter = client1.counter('counter test', { subscribe: false, cacheFile: cacheFile })
//         counter.events.on('ready', () => {
//           assert.equal(counter.value(), 14)
//           clearTimeout(timeout)
//           client1.disconnect()
//           done()
//         })
//       })

//       it.only('syncs counters', (done) => {
//         const name = new Date().getTime();
//         console.log(client1._ipfs.apiHost, client1._ipfs.apiPort)
//         console.log(client2._ipfs.apiHost, client2._ipfs.apiPort)

//         const counter1 = client1.counter(name)
//         const counter2 = client2.counter(name)
//         const res1 = ([13, 10]).map((f) => counter1.inc(f))//, { concurrency: 1 })
//         const res2 = ([2, 5]).map((f) => counter2.inc(f))//, { concurrency: 1 })
//         Promise.map(res1.concat(res2), { concurrency: 1 })
//           .then((res) => {
//             // wait for a while to make sure db's have been synced
//             setTimeout(() => {
//               assert.equal(counter1.value(), 30)
//               assert.equal(counter2.value(), 30)
//               done()
//             }, 4000)
//           })
//           .catch(done)
//       })

//     });
//   });

// });
