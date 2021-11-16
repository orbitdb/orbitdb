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
  waitForPeers
} = require('orbit-db-test-utils')

const orbitdbPath1 = './orbitdb/tests/counters/1'
const orbitdbPath2 = './orbitdb/tests/counters/2'
const dbPath1 = './orbitdb/tests/counters/db1'
const dbPath2 = './orbitdb/tests/counters/db2'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Counters (${API})`, function () {
    this.timeout(config.timeout)

    let orbitdb1, orbitdb2
    let ipfsd1, ipfsd2, ipfs1, ipfs2

    before(async () => {
      rmrf.sync(dbPath1)
      rmrf.sync(dbPath2)
      rmrf.sync(orbitdbPath1)
      rmrf.sync(orbitdbPath2)
      ipfsd1 = await startIpfs(API, config.daemon1)
      ipfsd2 = await startIpfs(API, config.daemon2)
      ipfs1 = ipfsd1.api
      ipfs2 = ipfsd2.api
      // Connect the peers manually to speed up test times
      const isLocalhostAddress = (addr) => addr.toString().includes('127.0.0.1')
      await connectPeers(ipfs1, ipfs2, { filter: isLocalhostAddress })
    })

    after(async () => {
      if (orbitdb1)
        await orbitdb1.stop()

      if (orbitdb2)
        await orbitdb2.stop()

      if (ipfsd1)
        await stopIpfs(ipfsd1)

      if (ipfsd2)
        await stopIpfs(ipfsd2)
    })

    beforeEach(async () => {
      orbitdb1 = await OrbitDB.createInstance(ipfs1, { directory: './orbitdb/1' })
      orbitdb2 = await OrbitDB.createInstance(ipfs2, { directory: './orbitdb/2' })
    })

    afterEach(async () => {
      if (orbitdb1)
        await orbitdb1.stop()

      if (orbitdb2)
        await orbitdb2.stop()
    })

    describe('counters', function() {
      let address

      it('creates and opens a database', async () => {
        const db = await orbitdb1.counter('counter database')
        assert.notEqual(db, null)
        assert.equal(db.type, 'counter')
        assert.equal(db.dbname, 'counter database')
      })

      it('value is zero when it\'s a fresh database', async () => {
        const db = await orbitdb1.counter('counter database')
        assert.equal(db.value, 0)
        await db.close()
      })

      it('increases a counter value', async () => {
        const counter = await orbitdb1.counter('counter test', { path: dbPath1 })
        address = counter.address.toString()
        await mapSeries([13, 1], (f) => counter.inc(f))
        assert.equal(counter.value, 14)
        await counter.close()
      })

      it('opens a saved counter', async () => {
        const counter = await orbitdb1.counter(address, { path: dbPath1 })
        await counter.load()
        assert.equal(counter.value, 14)
        await counter.drop()
      })

      it('syncs counters', async () => {
        console.log("Sync counters")

        let options = {
          accessController: {
            // Set write access for both clients
            write: [
              orbitdb1.identity.id,
              orbitdb2.identity.id
            ]
          }
        }

        const dbName = new Date().getTime().toString()

        const numbers = [[13, 10], [2, 5]]
        const increaseCounter = (counterDB, i) => mapSeries(numbers[i], n => counterDB.inc(n))

        // Create a new counter database in the first client
        options = Object.assign({}, options, { path: dbPath1 })
        const counter1 = await orbitdb1.counter(dbName, options)

        // Open the database in the second client
        options = Object.assign({}, options, { path: dbPath2 })
        const counter2 = await orbitdb2.counter(dbName, options)

        // Make sure database addresses match since they're built deterministically
        assert.equal(counter1.address.toString(), counter2.address.toString())

        // Wait for peers to connect
        console.log("Waiting for peers to connect")
        await waitForPeers(ipfs1, [orbitdb2.id], counter1.address.toString())
        await waitForPeers(ipfs2, [orbitdb1.id], counter1.address.toString())

        let finished1 = counter1.value === 30
        let finished2 = counter2.value === 30

        counter1.events.on('replicated', () => {
          finished1 = (counter1.value === 30)
          finished2 = (counter2.value === 30)
        })
        counter2.events.on('replicated', () => {
          finished1 = (counter1.value === 30)
          finished2 = (counter2.value === 30)
        })
        counter1.events.on('write', () => {
          finished1 = (counter1.value === 30)
          finished2 = (counter2.value === 30)
        })
        counter2.events.on('write', () => {
          finished1 = (counter1.value === 30)
          finished2 = (counter2.value === 30)
        })

        // Increase the counters sequentially
        await mapSeries([counter1, counter2], increaseCounter)
        console.log("Waiting for replication to finish")

        return new Promise((resolve, reject) => {
          let timer = setInterval(async () => {
            if (finished1 && finished2) {
              try {
                clearInterval(timer)
                assert.equal(counter1.value, 30)
                assert.equal(counter2.value, 30)
                await counter1.close()
                await counter2.close()
                resolve()
              } catch (e) {
                reject(e)
              }
            }
          }, 100)
        })
      })
    })
  })
})
