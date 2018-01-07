'use strict'

const assert = require('assert')
const mapSeries = require('p-each-series')
const rmrf = require('rimraf')
const OrbitDB = require('../src/OrbitDB')
const config = require('./utils/config')
const startIpfs = require('./utils/start-ipfs')
const waitForPeers = require('./utils/wait-for-peers')

const dbPath1 = './orbitdb/tests/replication/1'
const dbPath2 = './orbitdb/tests/replication/2'
const ipfsPath1 = './orbitdb/tests/replication/ipfs/1'
const ipfsPath2 = './orbitdb/tests/replication/ipfs/2'

const MemStore = require('./utils/mem-store')

describe('orbit-db - Replication', function() {
  this.timeout(config.timeout * 2)

  let ipfs1, ipfs2, orbitdb1, orbitdb2, db1, db2

  describe('two peers', function() {
    let timer
    let options

    beforeEach(async () => {
      clearInterval(timer)

      config.daemon1.repo = ipfsPath1
      config.daemon2.repo = ipfsPath2
      rmrf.sync(config.daemon1.repo)
      rmrf.sync(config.daemon2.repo)
      rmrf.sync(dbPath1)
      rmrf.sync(dbPath2)
      ipfs1 = await startIpfs(config.daemon1)
      ipfs2 = await startIpfs(config.daemon2)
      // Use memory store for quicker tests
      const memstore = new MemStore()
      ipfs1.object.put = memstore.put.bind(memstore)
      ipfs1.object.get = memstore.get.bind(memstore)
      ipfs2.object.put = memstore.put.bind(memstore)
      ipfs2.object.get = memstore.get.bind(memstore)
      // Connect the peers manually to speed up test times
      await ipfs2.swarm.connect(ipfs1._peerInfo.multiaddrs._multiaddrs[0].toString())
      await ipfs1.swarm.connect(ipfs2._peerInfo.multiaddrs._multiaddrs[0].toString())
      orbitdb1 = new OrbitDB(ipfs1, dbPath1)
      orbitdb2 = new OrbitDB(ipfs2, dbPath2)

      options = { 
        // Set write access for both clients
        write: [
          orbitdb1.key.getPublic('hex'), 
          orbitdb2.key.getPublic('hex')
        ],
      }

      options = Object.assign({}, options, { path: dbPath1 })
      db1 = await orbitdb1.eventlog('replication-tests', options)
      // Set 'sync' flag on. It'll prevent creating a new local database and rather
      // fetch the database from the network
//      options = Object.assign({}, options, { path: dbPath2, sync: true })
//      db2 = await orbitdb2.eventlog(db1.address.toString(), options)

//      assert.equal(db1.address.toString(), db2.address.toString())

//      await waitForPeers(ipfs1, [orbitdb2.id], db1.address.toString())
//      await waitForPeers(ipfs2, [orbitdb1.id], db1.address.toString())
    })

    afterEach(async () => {
      clearInterval(timer)
      options = {}

      if (db1)
        await db1.drop()
      
      if (db2) 
        await db2.drop()

      if(orbitdb1) 
        await orbitdb1.stop()

      if(orbitdb2) 
        await orbitdb2.stop()

      return new Promise((resolve) => {
        setTimeout(async () => {
          if (ipfs1)
            await ipfs1.stop()

          if (ipfs2)
            await ipfs2.stop()

          resolve()
        }, 2000)
      })
    })

    it('replicates database of 1 entry', async () => {
      options = Object.assign({}, options, { path: dbPath2, sync: true })
      db2 = await orbitdb2.eventlog(db1.address.toString(), options)
      await waitForPeers(ipfs2, [orbitdb1.id], db1.address.toString())

      await db1.add('hello')
      return new Promise(resolve => {
        setTimeout(() => {
          const items = db2.iterator().collect()
          assert.equal(items.length, 1)
          assert.equal(items[0].payload.value, 'hello')
          resolve()
        }, 1000)
      })
    })

    it('replicates database of 100 entries', async () => {
      options = Object.assign({}, options, { path: dbPath2, sync: true })
      db2 = await orbitdb2.eventlog(db1.address.toString(), options)
      await waitForPeers(ipfs2, [orbitdb1.id], db1.address.toString())

      const entryCount = 100
      const entryArr = []

      for (let i = 0; i < entryCount; i ++)
        entryArr.push(i)

      await mapSeries(entryArr, (i) => db1.add('hello' + i))

      return new Promise(resolve => {
        timer = setInterval(() => {
          const items = db2.iterator({ limit: -1 }).collect()
          if (items.length === entryCount) {
            clearInterval(timer)
            assert.equal(items.length, entryCount)
            assert.equal(items[0].payload.value, 'hello0')
            assert.equal(items[items.length - 1].payload.value, 'hello99')
            resolve()
          }
        }, 1000)
      })
    })

    it('emits correct replication info', async () => {
      options = Object.assign({}, options, { path: dbPath2, sync: true })
      db2 = await orbitdb2.eventlog(db1.address.toString(), options)
      await waitForPeers(ipfs2, [orbitdb1.id], db1.address.toString())

      let finished = false
      let eventCount = { 'replicate': 0, 'replicate.progress': 0, 'replicated': 0 }
      let events = []
      let expectedEventCount = 99

      db2.events.on('replicate', (address, entry) => {
        eventCount['replicate'] ++
        events.push({ 
          event: 'replicate', 
          count: eventCount['replicate'], 
          entry: entry,
        })
      })

      db2.events.on('replicate.progress', (address, hash, entry, progress) => {
        eventCount['replicate.progress'] ++
        events.push({ 
          event: 'replicate.progress', 
          count: eventCount['replicate.progress'], 
          entry: entry ,
          replicationInfo: {
            max: db2._replicationInfo.max,
            progress: db2._replicationInfo.progress,
            have: db2._replicationInfo.have,
          },
        })
      })

      db2.events.on('replicated', (address) => {
        eventCount['replicated'] ++
        events.push({ 
          event: 'replicated', 
          count: eventCount['replicate'], 
          replicationInfo: {
            max: db2._replicationInfo.max,
            progress: db2._replicationInfo.progress,
            have: db2._replicationInfo.have,
          },
        })
        // Resolve with a little timeout to make sure we 
        // don't receive more than one event
        setTimeout(() => {
          finished = db2.iterator({ limit: -1 }).collect().length === expectedEventCount
        }, 500)
      })

      return new Promise((resolve, reject) => {
        try {
          timer = setInterval(() => {
            if (finished) {
              clearInterval(timer)

              assert.equal(eventCount['replicate'], expectedEventCount)
              assert.equal(eventCount['replicate.progress'], expectedEventCount)

              const replicateEvents = events.filter(e => e.event === 'replicate')
              assert.equal(replicateEvents.length, expectedEventCount)
              assert.equal(replicateEvents[0].entry.payload.value.split(' ')[0], 'hello')
              assert.equal(replicateEvents[0].entry.clock.time, 1)

              const replicateProgressEvents = events.filter(e => e.event === 'replicate.progress')
              assert.equal(replicateProgressEvents.length, expectedEventCount)
              assert.equal(replicateProgressEvents[0].entry.payload.value.split(' ')[0], 'hello')
              assert.equal(replicateProgressEvents[0].entry.clock.time, 1)
              assert.equal(replicateProgressEvents[0].replicationInfo.max, 1)
              assert.equal(replicateProgressEvents[0].replicationInfo.progress, 1)

              const replicatedEvents = events.filter(e => e.event === 'replicated')
              assert.equal(replicatedEvents[0].replicationInfo.max, 1)
              assert.equal(replicatedEvents[0].replicationInfo.progress, 1)

              resolve()
            }
          }, 100)
        } catch (e) {
          reject(e)
        }

        // Trigger replication
        let adds = []
        for (let i = 0; i < expectedEventCount; i ++) {
          adds.push(i)
        }

        mapSeries(adds, i => db1.add('hello ' + i))
      })
    })

    it('emits correct replication info on fresh replication', async () => {
      return new Promise(async (resolve, reject) => {
        let finished = false
        let eventCount = { 'replicate': 0, 'replicate.progress': 0, 'replicated': 0 }
        let events = []
        let expectedEventCount = 512

        // Close second instance
       await db2.close()
       await db2.drop()

        // Trigger replication
        let adds = []
        for (let i = 0; i < expectedEventCount; i ++) {
          adds.push(i)
        }

        const add = async (i) => {
          process.stdout.write("\rWriting " + (i + 1) + " / " + expectedEventCount)
          await db1.add('hello ' + i)
        }

        await mapSeries(adds, add)
        console.log()

        // Open second instance again
        options = {
          path: dbPath2, 
          overwrite: true,
          sync: true,
          // Set write access for both clients
          write: [
            orbitdb1.key.getPublic('hex'), 
            orbitdb2.key.getPublic('hex')
          ],
        }

        db2 = await orbitdb2.eventlog(db1.address.toString(), options)

        let current = 0
        let total = 0

        db2.events.on('replicate', (address, entry) => {
          eventCount['replicate'] ++
          total = db2._replicationInfo.max
          // console.log("[replicate] ", '#' + eventCount['replicate'] + ':', current, '/', total, '| Tasks (in/queued/running/out):', db2._loader.tasksRequested, '/',  db2._loader.tasksQueued,  '/', db2._loader.tasksRunning, '/', db2._loader.tasksFinished)
          events.push({ 
            event: 'replicate', 
            count: eventCount['replicate'], 
            entry: entry,
          })
        })

        db2.events.on('replicate.progress', (address, hash, entry) => {
          eventCount['replicate.progress'] ++
          current = db2._replicationInfo.progress
          // console.log("[progress]  ", '#' + eventCount['replicate.progress'] + ':', current, '/', total, '| Tasks (in/queued/running/out):', db2._loader.tasksRequested, '/',  db2._loader.tasksQueued,  '/', db2._loader.tasksRunning, '/', db2._loader.tasksFinished)
          // assert.equal(db2._replicationInfo.progress, eventCount['replicate.progress'])
          events.push({ 
            event: 'replicate.progress', 
            count: eventCount['replicate.progress'], 
            entry: entry ,
            replicationInfo: {
              max: db2._replicationInfo.max,
              progress: db2._replicationInfo.progress,
              have: db2._replicationInfo.have,
            },
          })
        })

        db2.events.on('replicated', (address, length) => {
          eventCount['replicated'] += length
          current = db2._replicationInfo.progress
          // console.log("[replicated]", '#' + eventCount['replicated'] + ':', current, '/', total, '| Tasks (in/queued/running/out):', db2._loader.tasksRequested, '/',  db2._loader.tasksQueued,  '/', db2._loader.tasksRunning, '/', db2._loader.tasksFinished, "|", db2._loader._stats.a, db2._loader._stats.b, db2._loader._stats.c, db2._loader._stats.d)
          assert.equal(current, eventCount['replicated'])
          assert.equal(total, expectedEventCount)

          // Test the replicator state
          assert.equal(db2._loader.tasksRequested >= current, true)
          assert.equal(db2._loader.tasksQueued <= db2.options.referenceCount, true)
          assert.equal(db2.options.referenceCount, 64)
          assert.equal(db2._loader.tasksRunning, 0)
          assert.equal(db2._loader.tasksFinished, current)

          events.push({ 
            event: 'replicated', 
            count: eventCount['replicate'], 
            replicationInfo: {
              max: db2._replicationInfo.max,
              progress: db2._replicationInfo.progress,
              have: db2._replicationInfo.have,
            },
          })
          // Resolve with a little timeout to make sure we 
          // don't receive more than one event
          setTimeout(() => {
            //console.log(eventCount['replicate.progress'], expectedEventCount)

            if (eventCount['replicate.progress'] === expectedEventCount)
              finished = true
          }, 500)
        })

        try {
          const st = new Date().getTime()
          timer = setInterval(async () => {
            if (finished) {
              clearInterval(timer)

              const et = new Date().getTime()
              console.log("Duration:", et - st, "ms")

              assert.equal(eventCount['replicate'], expectedEventCount)
              assert.equal(eventCount['replicate.progress'], expectedEventCount)

              const replicateEvents = events.filter(e => e.event === 'replicate')
              assert.equal(replicateEvents.length, expectedEventCount)
              assert.equal(replicateEvents[0].entry.payload.value.split(' ')[0], 'hello')
              assert.equal(replicateEvents[0].entry.clock.time, expectedEventCount)

              const replicateProgressEvents = events.filter(e => e.event === 'replicate.progress')
              assert.equal(replicateProgressEvents.length, expectedEventCount)
              assert.equal(replicateProgressEvents[0].entry.payload.value.split(' ')[0], 'hello')
              assert.equal(replicateProgressEvents[0].entry.clock.time, expectedEventCount)
              assert.equal(replicateProgressEvents[0].replicationInfo.max, expectedEventCount)
              assert.equal(replicateProgressEvents[0].replicationInfo.progress, 1)

              const replicatedEvents = events.filter(e => e.event === 'replicated')
              assert.equal(replicatedEvents[0].replicationInfo.max, expectedEventCount)
              assert.equal(replicatedEvents[replicatedEvents.length - 1].replicationInfo.progress, expectedEventCount)

              resolve()
            }
          }, 100)
        } catch (e) {
          reject(e)
        }
      })
    })

    it('emits correct replication info in two-way replication', async () => {
      return new Promise(async (resolve, reject) => {
        let finished = false
        let eventCount = { 'replicate': 0, 'replicate.progress': 0, 'replicated': 0 }
        let events = []
        let expectedEventCount = 100

        // Trigger replication
        let adds = []
        for (let i = 0; i < expectedEventCount; i ++) {
          adds.push(i)
        }

        const add = async (i) => {
          // process.stdout.write("\rWriting " + (i + 1) + " / " + expectedEventCount)
          await Promise.all([db1.add('hello-1-' + i), db2.add('hello-2-' + i)])
        }

        // Open second instance again
        let options = {
          path: dbPath2, 
          overwrite: true,
          sync: true,
          // Set write access for both clients
          write: [
            orbitdb1.key.getPublic('hex'), 
            orbitdb2.key.getPublic('hex')
          ],
        }
        db2 = await orbitdb2.eventlog(db1.address.toString(), options)
        await waitForPeers(ipfs2, [orbitdb1.id], db1.address.toString())

        let current = 0
        let total = 0

        db2.events.on('replicate', (address, entry) => {
          eventCount['replicate'] ++
          current = db2._replicationInfo.progress
          total = db2._replicationInfo.max
          // console.log("[replicate] ", '#' + eventCount['replicate'] + ':', current, '/', total, '| Tasks (in/queued/running/out):', db2._loader.tasksRequested, '/',  db2._loader.tasksQueued,  '/', db2._loader.tasksRunning, '/', db2._loader.tasksFinished)
          events.push({ 
            event: 'replicate', 
            count: eventCount['replicate'], 
            entry: entry,
          })
        })

        let prevProgress = 0
        db2.events.on('replicate.progress', (address, hash, entry) => {
          eventCount['replicate.progress'] ++
          current = db2._replicationInfo.progress
          total = db2._replicationInfo.max
          // console.log("[progress]  ", '#' + eventCount['replicate.progress'] + ':', current, '/', total, '| Tasks (in/queued/running/out):', db2._loader.tasksRequested, '/',  db2._loader.tasksQueued,  '/', db2._loader.tasksRunning, '/', db2._loader.tasksFinished)
          // assert.equal(current, total)
          events.push({ 
            event: 'replicate.progress', 
            count: eventCount['replicate.progress'], 
            entry: entry ,
            replicationInfo: {
              max: db2._replicationInfo.max,
              progress: db2._replicationInfo.progress,
              have: db2._replicationInfo.have,
            },
          })
        })

        db2.events.on('replicated', (address, length) => {
          eventCount['replicated'] += length
          current = db2._replicationInfo.progress
          total = db2._replicationInfo.max
          const values = db2.iterator({limit: -1}).collect()
          // console.log(current, "/", total, "/", values.length)
          //console.log("[replicated]", '#' + eventCount['replicated'] + ':', current, '/', total, '| Tasks (in/queued/running/out):', db2._loader.tasksRequested, '/',  db2._loader.tasksQueued,  '/', db2._loader.tasksRunning, '/', db2._loader.tasksFinished, "|", db2._loader._stats.a, db2._loader._stats.b, db2._loader._stats.c, db2._loader._stats.d)
          assert.equal(current <= total, true)
          events.push({ 
            event: 'replicated', 
            count: eventCount['replicate'], 
            replicationInfo: {
              max: db2._replicationInfo.max,
              progress: db2._replicationInfo.progress,
              have: db2._replicationInfo.have,
            },
          })

          if (db2._replicationInfo.max >= expectedEventCount * 2
           && db2._replicationInfo.progress >= expectedEventCount * 2) 
            finished = true
        })

        const st = new Date().getTime()

        try {
          await mapSeries(adds, add)

          timer = setInterval(() => {
            if (finished) {
              clearInterval(timer)

              const et = new Date().getTime()
              console.log("Duration:", et - st, "ms")

              assert.equal(eventCount['replicate'], expectedEventCount)
              assert.equal(eventCount['replicate.progress'], expectedEventCount)
              assert.equal(eventCount['replicated'], expectedEventCount)

              const replicateEvents = events.filter(e => e.event === 'replicate')
              assert.equal(replicateEvents.length, expectedEventCount)

              const replicateProgressEvents = events.filter(e => e.event === 'replicate.progress')
              assert.equal(replicateProgressEvents.length, expectedEventCount)
              assert.equal(replicateProgressEvents[replicateProgressEvents.length - 1].entry.clock.time, expectedEventCount)
              assert.equal(replicateProgressEvents[replicateProgressEvents.length - 1].replicationInfo.max, expectedEventCount * 2)
              assert.equal(replicateProgressEvents[replicateProgressEvents.length - 1].replicationInfo.progress, expectedEventCount * 2)

              const replicatedEvents = events.filter(e => e.event === 'replicated')
              assert.equal(replicatedEvents[replicatedEvents.length - 1].replicationInfo.progress, expectedEventCount * 2)
              assert.equal(replicatedEvents[replicatedEvents.length - 1].replicationInfo.max, expectedEventCount * 2)

              const values1 = db1.iterator({limit: -1}).collect()
              const values2 = db2.iterator({limit: -1}).collect()
              assert.deepEqual(values1, values2)

              // Test the replicator state
              assert.equal(db1._loader.tasksRequested, expectedEventCount)
              assert.equal(db1._loader.tasksQueued, 0)
              assert.equal(db1._loader.tasksRunning, 0)
              assert.equal(db1._loader.tasksFinished, expectedEventCount)
              assert.equal(db2._loader.tasksRequested, expectedEventCount)
              assert.equal(db2._loader.tasksQueued, 0)
              assert.equal(db2._loader.tasksRunning, 0)
              assert.equal(db2._loader.tasksFinished, expectedEventCount)

              resolve()
            }
          }, 100)
        } catch (e) {
          reject(e)
        }
      })
    })
  })
})
