'use strict'

const assert = require('assert')
const mapSeries = require('p-each-series')
const rmrf = require('rimraf')
const OrbitDB = require('../src/OrbitDB')

// Include test utilities
const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs,
  connectPeers,
  waitForPeers,
  MemStore,
} = require('orbit-db-test-utils')

const dbPath1 = './orbitdb/tests/replication/1'
const dbPath2 = './orbitdb/tests/replication/2'
const ipfsPath1 = './orbitdb/tests/replication/1/ipfs'
const ipfsPath2 = './orbitdb/tests/replication/2/ipfs'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Replication (${API})`, function() {
    this.timeout(config.timeout)

    let ipfsd1, ipfsd2, ipfs1, ipfs2
    let orbitdb1, orbitdb2, db1, db2
    let id1, id2

    let timer
    let options

    before(async () => {
      config.daemon1.repo = ipfsPath1
      config.daemon2.repo = ipfsPath2
      rmrf.sync(config.daemon1.repo)
      rmrf.sync(config.daemon2.repo)
      rmrf.sync(dbPath1)
      rmrf.sync(dbPath2)
      ipfsd1 = await startIpfs(API, config.daemon1)
      ipfsd2 = await startIpfs(API, config.daemon2)
      ipfs1 = ipfsd1.api
      ipfs2 = ipfsd2.api
      // Use memory store for quicker tests
      const memstore = new MemStore()
      ipfs1.dag.put = memstore.put.bind(memstore)
      ipfs1.dag.get = memstore.get.bind(memstore)
      ipfs2.dag.put = memstore.put.bind(memstore)
      ipfs2.dag.get = memstore.get.bind(memstore)
      // Connect the peers manually to speed up test times
      await connectPeers(ipfs1, ipfs2)
    })

    after(async () => {
      if (ipfsd1)
        await stopIpfs(ipfsd1)

      if (ipfsd2)
        await stopIpfs(ipfsd2)
    })

    beforeEach(async () => {
      clearInterval(timer)
      orbitdb1 = await OrbitDB.createInstance(ipfs1, { directory: dbPath1 })
      orbitdb2 = await OrbitDB.createInstance(ipfs2, { directory: dbPath2 })

      options = {
        // Set write access for both clients
        accessController: {
          write: [
            orbitdb1.identity.id,
            orbitdb2.identity.id
          ]
        }
      }

      options = Object.assign({}, options, { directory: dbPath1 })
      db1 = await orbitdb1.eventlog('replication-tests', options)
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
    })

    it('replicates database of 1 entry', async () => {
      // Set 'sync' flag on. It'll prevent creating a new local database and rather
      // fetch the database from the network
      options = Object.assign({}, options, { directory: dbPath2, sync: true })
      db2 = await orbitdb2.eventlog(db1.address.toString(), options)
      await waitForPeers(ipfs2, [orbitdb1.id], db1.address.toString())

      await db1.add('hello')
      return new Promise(resolve => {
        setTimeout(() => {
          const items = db2.iterator().collect()
          assert.equal(items.length, 1)
          assert.equal(items[0].payload.value, 'hello')
          resolve()
        }, 500)
      })
    })

    it('replicates database of 100 entries', async () => {
      options = Object.assign({}, options, { directory: dbPath2, sync: true })
      db2 = await orbitdb2.eventlog(db1.address.toString(), options)
      await waitForPeers(ipfs2, [orbitdb1.id], db1.address.toString())

      const entryCount = 100
      const entryArr = []

      for (let i = 0; i < entryCount; i ++)
        entryArr.push(i)

      return new Promise(async (resolve, reject) => {
        try {
          const add = i => db1.add('hello' + i)
          await mapSeries(entryArr, add)
        } catch (e) {
          reject(e)
        }

        timer = setInterval(() => {
          const items = db2.iterator({ limit: -1 }).collect()
          if (items.length === entryCount) {
            clearInterval(timer)
            assert.equal(items.length, entryCount)
            assert.equal(items[0].payload.value, 'hello0')
            assert.equal(items[items.length - 1].payload.value, 'hello99')
            resolve()
          }
        }, 100)
      })
    })

    it('emits correct replication info', async () => {
      options = Object.assign({}, options, { directory: dbPath2, sync: true })
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

      db2.events.on('replicate.progress', (address, hash, entry, progress, total) => {
        eventCount['replicate.progress'] ++
        events.push({
          event: 'replicate.progress',
          count: eventCount['replicate.progress'],
          entry: entry ,
          replicationInfo: {
            max: db2.replicationStatus.max,
            progress: db2.replicationStatus.progress,
          },
        })
      })

      db2.events.on('replicated', (address) => {
        eventCount['replicated'] ++
        events.push({
          event: 'replicated',
          count: eventCount['replicate'],
          replicationInfo: {
            max: db2.replicationStatus.max,
            progress: db2.replicationStatus.progress,
          },
        })
        // Resolve with a little timeout to make sure we
        // don't receive more than one event
        setTimeout(() => {
          finished = db2.iterator({ limit: -1 }).collect().length === expectedEventCount
        }, 200)
      })

      return new Promise((resolve, reject) => {
        try {
          timer = setInterval(() => {
            if (finished) {
              clearInterval(timer)

              assert.equal(eventCount['replicate'], expectedEventCount)
              assert.equal(eventCount['replicate.progress'], expectedEventCount)

              const replicateEvents = events.filter(e => e.event === 'replicate')
              const minClock = Math.min(...replicateEvents.filter(e => !!e.entry.clock).map(e => e.entry.clock.time))
              assert.equal(replicateEvents.length, expectedEventCount)
              assert.equal(replicateEvents[0].entry.payload.value.split(' ')[0], 'hello')
              assert.equal(minClock, 1)

              const replicateProgressEvents = events.filter(e => e.event === 'replicate.progress')
              const minProgressClock = Math.min(...replicateProgressEvents.filter(e => !!e.entry.clock).map(e => e.entry.clock.time))
              assert.equal(replicateProgressEvents.length, expectedEventCount)
              assert.equal(replicateProgressEvents[0].entry.payload.value.split(' ')[0], 'hello')
              assert.equal(minProgressClock, 1)
              assert.equal(replicateProgressEvents[0].replicationInfo.max >= 1, true)
              assert.equal(replicateProgressEvents[0].replicationInfo.progress, 1)

              const replicatedEvents = events.filter(e => e.event === 'replicated')
              assert.equal(replicatedEvents[0].replicationInfo.max >= 1, true)
              assert.equal(replicatedEvents[0].replicationInfo.progress >= 1, true)

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

        // Trigger replication
        let adds = []
        for (let i = 0; i < expectedEventCount; i ++) {
          adds.push(i)
        }

        const add = async (i) => {
          process.stdout.write("\rWriting " + (i + 1) + " / " + expectedEventCount + " ")
          await db1.add('hello ' + i)
        }

        await mapSeries(adds, add)

        // Open second instance again
        options = {
          directory: dbPath2 + '1',
          overwrite: true,
          sync: true,
        }

        db2 = await orbitdb2.eventlog(db1.address.toString(), options)

        db2.events.on('replicate', (address, entry) => {
          eventCount['replicate'] ++
          // console.log("[replicate] ", '#' + eventCount['replicate'] + ':', db2.replicationStatus.progress, '/', db2.replicationStatus.max, '| Tasks (in/queued/running/out):', db2._loader.tasksRequested, '/',  db2._loader.tasksQueued,  '/', db2._loader.tasksRunning, '/', db2._loader.tasksFinished)
          events.push({
            event: 'replicate',
            count: eventCount['replicate'],
            entry: entry,
          })
        })

        db2.events.on('replicate.progress', (address, hash, entry) => {
          eventCount['replicate.progress'] ++
          // console.log("[progress]  ", '#' + eventCount['replicate.progress'] + ':', db2.replicationStatus.progress, '/', db2.replicationStatus.max, '| Tasks (in/queued/running/out):', db2._loader.tasksRequested, '/',  db2._loader.tasksQueued,  '/', db2._loader.tasksRunning, '/', db2._loader.tasksFinished)
          // assert.equal(db2.replicationStatus.progress, eventCount['replicate.progress'])
          events.push({
            event: 'replicate.progress',
            count: eventCount['replicate.progress'],
            entry: entry ,
            replicationInfo: {
              max: db2.replicationStatus.max,
              progress: db2.replicationStatus.progress,
            },
          })
        })

        db2.events.on('replicated', (address, length) => {
          eventCount['replicated'] += length
          // console.log("[replicated]", '#' + eventCount['replicated'] + ':', db2.replicationStatus.progress, '/', db2.replicationStatus.max, '| Tasks (in/queued/running/out):', db2._loader.tasksRequested, '/',  db2._loader.tasksQueued,  '/', db2._loader.tasksRunning, '/', db2._loader.tasksFinished, "|")
          try {
            // Test the replicator state
            assert.equal(db2._loader.tasksRequested >= db2.replicationStatus.progress, true)
            assert.equal(db2.options.referenceCount, 32)
            assert.equal(db2._loader.tasksRunning, 0)
          } catch (e) {
            reject(e)
          }

          events.push({
            event: 'replicated',
            count: eventCount['replicate'],
            replicationInfo: {
              max: db2.replicationStatus.max,
              progress: db2.replicationStatus.progress,
            },
          })
          // Resolve with a little timeout to make sure we
          // don't receive more than one event
          setTimeout( async () => {
            if (eventCount['replicated'] === expectedEventCount) {
              finished = true
            }
          }, 100)
        })

        const st = new Date().getTime()
        timer = setInterval(async () => {
          if (finished) {
            clearInterval(timer)

            const et = new Date().getTime()
            console.log("Duration:", et - st, "ms")

            try {
              assert.equal(eventCount['replicate'], expectedEventCount)
              assert.equal(eventCount['replicate.progress'], expectedEventCount)

              const replicateEvents = events.filter(e => e.event === 'replicate')
              const maxClock = Math.max(...replicateEvents.filter(e => !!e.entry.clock).map(e => e.entry.clock.time))
              assert.equal(replicateEvents.length, expectedEventCount)
              assert.equal(replicateEvents[0].entry.payload.value.split(' ')[0], 'hello')
              assert.equal(maxClock, expectedEventCount)

              const replicateProgressEvents = events.filter(e => e.event === 'replicate.progress')
              const maxProgressClock = Math.max(...replicateProgressEvents.filter(e => !!e.entry.clock).map(e => e.entry.clock.time))
              const maxReplicationMax = Math.max(...replicateProgressEvents.map(e => e.replicationInfo.max))
              assert.equal(replicateProgressEvents.length, expectedEventCount)
              assert.equal(replicateProgressEvents[0].entry.payload.value.split(' ')[0], 'hello')
              assert.equal(maxProgressClock, expectedEventCount)
              assert.equal(maxReplicationMax, expectedEventCount)
              assert.equal(replicateProgressEvents[0].replicationInfo.progress, 1)

              const replicatedEvents = events.filter(e => e.event === 'replicated')
              const replicateMax = Math.max(...replicatedEvents.map(e => e.replicationInfo.max))
              assert.equal(replicateMax, expectedEventCount)
              assert.equal(replicatedEvents[replicatedEvents.length - 1].replicationInfo.progress, expectedEventCount)

              resolve()
            } catch (e) {
              reject(e)
            }
          }
        }, 100)
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
          directory: dbPath2,
          overwrite: true,
          sync: true,
        }

        db2 = await orbitdb2.eventlog(db1.address.toString(), options)
        assert.equal(db1.address.toString(), db2.address.toString())
        await waitForPeers(ipfs2, [orbitdb1.id], db1.address.toString())

        db2.events.on('replicate', (address, entry) => {
          eventCount['replicate'] ++
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
          // console.log("[progress]  ", '#' + eventCount['replicate.progress'] + ':', current, '/', total, '| Tasks (in/queued/running/out):', db2._loader.tasksRequested, '/',  db2._loader.tasksQueued,  '/', db2._loader.tasksRunning, '/', db2._loader.tasksFinished)
          // assert.equal(current, total)
          events.push({
            event: 'replicate.progress',
            count: eventCount['replicate.progress'],
            entry: entry ,
            replicationInfo: {
              max: db2.replicationStatus.max,
              progress: db2.replicationStatus.progress,
            },
          })
        })

        db2.events.on('replicated', (address, length) => {
          eventCount['replicated'] += length
          const values = db2.iterator({limit: -1}).collect()
          // console.log("[replicated]", '#' + eventCount['replicated'] + ':', current, '/', total, '| Tasks (in/queued/running/out):', db2._loader.tasksRequested, '/',  db2._loader.tasksQueued,  '/', db2._loader.tasksRunning, '/', db2._loader.tasksFinished, "|", db2._loader._stats.a, db2._loader._stats.b, db2._loader._stats.c, db2._loader._stats.d)
          try {
            assert.equal(db2.replicationStatus.progress <= db2.replicationStatus.max, true)
          } catch (e) {
            reject(e)
          }

          events.push({
            event: 'replicated',
            count: eventCount['replicate'],
            replicationInfo: {
              max: db2.replicationStatus.max,
              progress: db2.replicationStatus.progress,
            },
          })

          if (db2.replicationStatus.max >= expectedEventCount * 2
           && db2.replicationStatus.progress >= expectedEventCount * 2)
            finished = true
        })

        const st = new Date().getTime()

        try {
          await mapSeries(adds, add)

          timer = setInterval(() => {
            if (finished) {
              clearInterval(timer)

              const et = new Date().getTime()
              // console.log("Duration:", et - st, "ms")

              assert.equal(eventCount['replicate'], expectedEventCount)
              assert.equal(eventCount['replicate.progress'], expectedEventCount)
              assert.equal(eventCount['replicated'], expectedEventCount)

              const replicateEvents = events.filter(e => e.event === 'replicate')
              assert.equal(replicateEvents.length, expectedEventCount)

              const replicateProgressEvents = events.filter(e => e.event === 'replicate.progress')
              const maxProgressClock = Math.max(...replicateProgressEvents.filter(e => !!e.entry.clock).map(e => e.entry.clock.time))
              assert.equal(replicateProgressEvents.length, expectedEventCount)
              assert.equal(maxProgressClock, expectedEventCount)
              assert.equal(db2.replicationStatus.max, expectedEventCount * 2)
              assert.equal(db2.replicationStatus.progress, expectedEventCount * 2)

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
