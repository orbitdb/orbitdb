'use strict'

const assert = require('assert')
const mapSeries = require('p-each-series')
const path = require('path')
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
} = require('./utils')

const dbPath1 = './orbitdb/tests/counters/peer1'
const dbPath2 = './orbitdb/tests/counters/peer2'
const ipfsPath1 = './orbitdb/tests/counters/peer1/ipfs'
const ipfsPath2 = './orbitdb/tests/counters/peer2/ipfs'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Counters (${API})`, function() {
    this.timeout(config.timeout)

    let orbitdb1, orbitdb2
    let ipfsd1, ipfsd2, ipfs1, ipfs2

    before(async () => {
      rmrf.sync(dbPath1)
      rmrf.sync(dbPath2)
      config.daemon1.repo = ipfsPath1
      config.daemon2.repo = ipfsPath2
      ipfsd1 = await startIpfs(API, config.daemon1)
      ipfsd2 = await startIpfs(API, config.daemon2)
      ipfs1 = ipfsd1.api
      ipfs2 = ipfsd2.api
      // Connect the peers manually to speed up test times
      await connectPeers(ipfs1, ipfs2)
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

    beforeEach(() => {
      orbitdb1 = new OrbitDB(ipfs1, './orbitdb/1')
      orbitdb2 = new OrbitDB(ipfs2, './orbitdb/2')
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

      it('value is undefined when it\'s a fresh database', async () => {
        const db = await orbitdb1.feed('counter database')
        assert.equal(db.value, undefined)
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
        await counter.close()
      })

      it('syncs counters', async () => {
        let options = {
          // Set write access for both clients
          write: [
            orbitdb1.key.getPublic('hex'), 
            orbitdb2.key.getPublic('hex')
          ],
        }

        const numbers = [[13, 10], [2, 5]]
        const increaseCounter = (counterDB, i) => mapSeries(numbers[i], n => counterDB.inc(n))

        // Create a new counter database in the first client
        options = Object.assign({}, options, { path: dbPath1 })
        const counter1 = await orbitdb1.counter(new Date().getTime().toString(), options)
        // Open the database in the second client
        options = Object.assign({}, options, { path: dbPath2, sync: true })
        const counter2 = await orbitdb2.counter(counter1.address.toString(), options)

        // Wait for peers to connect first
        await waitForPeers(ipfs1, [orbitdb2.id], counter1.address.toString())
        await waitForPeers(ipfs2, [orbitdb1.id], counter1.address.toString())

        // Increase the counters sequentially
        await mapSeries([counter1, counter2], increaseCounter)

        return new Promise(resolve => {
          // Wait for a while to make sure db's have been synced
          setTimeout(() => {
            assert.equal(counter1.value, 30)
            assert.equal(counter2.value, 30)
            resolve()
          }, 1000)
        })
      })
    })
  })
})
