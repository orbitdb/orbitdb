// 'use strict'

// const path = require('path')
// const assert = require('assert')
// const Promise = require('bluebird')
// const rmrf = require('rimraf')
// const IpfsNodeDaemon = require('ipfs-daemon/src/ipfs-node-daemon')
// const IpfsNativeDaemon = require('ipfs-daemon/src/ipfs-native-daemon')
// const OrbitDB = require('../src/OrbitDB')

// const username  = 'testrunner'
// const username2 = 'rennurtset'
// const cacheFile = path.join(process.cwd(), '/tmp/orbit-db-tests/cache.json')

// const daemonConfs = require('./ipfs-daemons.conf.js')

// const waitForPeers = (ipfs, peersToWait, topic, callback) => {
//   const i = setInterval(() => {
//     ipfs.pubsub.peers(topic, (err, peers) => {
//       if (err) {
//         return callback(err)
//       }

//       const hasAllPeers = peersToWait.map((e) => peers.includes(e)).filter((e) => e === false).length === 0
//       if (hasAllPeers) {
//         clearInterval(i)
//         callback(null)
//       }
//     })
//   }, 1000)
// }

// [IpfsNodeDaemon].forEach((IpfsDaemon) => {
//   let ipfs, ipfsDaemon

//   describe('CounterStore', function() {
//     this.timeout(20000)
//     let client1, client2
//     let daemon1, daemon2

//     before((done) => {
//       rmrf.sync(cacheFile)
//       daemon1 = new IpfsDaemon(daemonConfs.daemon1)
//       daemon1.on('ready', () => {
//         daemon2 = new IpfsDaemon(daemonConfs.daemon2)
//         daemon2.on('ready', () => {
//           ipfs = [daemon1, daemon2]
//           done()
//         })
//       })
//     })

//     after((done) => {
//       daemon1.stop()
//       daemon2.stop()
//       rmrf.sync(cacheFile)
//       done()
//     })

//     beforeEach(() => {
//       client1 = new OrbitDB(ipfs[0])
//       client2 = new OrbitDB(ipfs[1])
//     })

//     afterEach(() => {
//       if (client1) client1.disconnect()
//       if (client2) client2.disconnect()
//     })

//     describe('counters', function() {
//       it('increases a counter value', function(done) {
//         const timeout = setTimeout(() => done(new Error('event was not fired')), 2000)
//         const counter = client1.counter('counter test', { subscribe: false, cacheFile: cacheFile })
//         counter.events.on('ready', () => {
//           Promise.map([13, 1], (f) => counter.inc(f), { concurrency: 1, cacheFile: cacheFile })
//             .then(() => {
//               assert.equal(counter.value, 14)
//               clearTimeout(timeout)
//               client1.disconnect()
//               done()
//             })
//             .catch(done)
//         })
//       })

//       it.skip('creates a new counter from cached data', function(done) {
//         const timeout = setTimeout(() => done(new Error('event was not fired')), 2000)
//         const counter = client1.counter('counter test', { subscribe: false, cacheFile: cacheFile })
//         counter.events.on('ready', () => {
//           assert.equal(counter.value, 14)
//           clearTimeout(timeout)
//           client1.disconnect()
//           done()
//         })
//       })

//       it.only('syncs counters', (done) => {
//         const name = new Date().getTime()
//         const counter1 = client1.counter(name)
//         const counter2 = client2.counter(name)
//         const numbers = [[13, 10], [2, 5]]
//         // const res1 = ([13, 10]).map((f) => counter1.inc(f))//, { concurrency: 1 })
//         // const res2 = ([2, 5]).map((f) => counter2.inc(f))//, { concurrency: 1 })

//         waitForPeers(daemon1, [daemon2.PeerId], name, (err, res) => {
//           waitForPeers(daemon2, [daemon1.PeerId], name, (err, res) => {
//           console.log("load!!!")
//             const increaseCounter = (counter, i) => numbers[i].map((e) => counter.inc(e))
//             Promise.map([counter1, counter2], increaseCounter, { concurrency: 1 })
//               .then((res) => {
//                 console.log("..", res)
//                 // wait for a while to make sure db's have been synced
//                 setTimeout(() => {
//                   assert.equal(counter2.value, 30)
//                   assert.equal(counter1.value, 30)
//                   done()
//                 }, 2000)
//               })
//               .catch(done)          
//           })
//         })
//       })

//     })
//   })

// })
