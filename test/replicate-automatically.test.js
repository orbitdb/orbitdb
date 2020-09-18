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
} = require('orbit-db-test-utils')

const dbPath1 = './orbitdb/tests/replicate-automatically/1'
const dbPath2 = './orbitdb/tests/replicate-automatically/2'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Automatic Replication (${API})`, function() {
    this.timeout(config.timeout)

    let ipfsd1, ipfsd2, ipfs1, ipfs2
    let orbitdb1, orbitdb2, db1, db2, db3, db4

    before(async () => {
      rmrf.sync(dbPath1)
      rmrf.sync(dbPath2)
      ipfsd1 = await startIpfs(API, config.daemon1)
      ipfsd2 = await startIpfs(API, config.daemon2)
      ipfs1 = ipfsd1.api
      ipfs2 = ipfsd2.api
      orbitdb1 = await OrbitDB.createInstance(ipfs1, { directory: dbPath1 })
      orbitdb2 = await OrbitDB.createInstance(ipfs2, { directory: dbPath2 })
      // Connect the peers manually to speed up test times
      await connectPeers(ipfs1, ipfs2)
    })

    after(async () => {
      if(orbitdb1)
        await orbitdb1.stop()

      if(orbitdb2)
        await orbitdb2.stop()

      if (ipfsd1)
        await stopIpfs(ipfsd1)

      if (ipfs2)
        await stopIpfs(ipfsd2)
    })

    beforeEach(async () => {
      let options = {}
      // Set write access for both clients
      options.write = [
        orbitdb1.identity.publicKey,
        orbitdb2.identity.publicKey
      ],

      options = Object.assign({}, options, { path: dbPath1 })
      db1 = await orbitdb1.eventlog('replicate-automatically-tests', options)
      db3 = await orbitdb1.keyvalue('replicate-automatically-tests-kv', options)
    })

    afterEach(async () => {
      if (db1) await db1.drop()
      if (db2) await db2.drop()
      if (db3) await db3.drop()
      if (db4) await db4.drop()
    })

    it('starts replicating the database when peers connect', async () => {
      const entryCount = 10
      const entryArr = []
      let options = {}
      let timer

      // Create the entries in the first database
      for (let i = 0; i < entryCount; i ++)
        entryArr.push(i)

      await mapSeries(entryArr, (i) => db1.add('hello' + i))

      // Open the second database
      options = Object.assign({}, options, { path: dbPath2, sync: true })
      db2 = await orbitdb2.eventlog(db1.address.toString(), options)

      // Listen for the 'replicated' events and check that all the entries
      // were replicated to the second database
      return new Promise((resolve, reject) => {
        db2.events.on('replicated', (address) => {
          try {
            const result1 = db1.iterator({ limit: -1 }).collect()
            const result2 = db2.iterator({ limit: -1 }).collect()
            // Make sure we have all the entries
            if (result1.length === entryCount && result2.length === entryCount) {
              assert.deepEqual(result1, result2)
              resolve()
            }
          } catch (e) {
            reject(e)
          }
        })
      })
    })

    it('automatic replication exchanges the correct heads', async () => {
      const entryCount = 33
      const entryArr = []
      let options = {}
      let timer

      // Create the entries in the first database
      for (let i = 0; i < entryCount; i ++)
        entryArr.push(i)

      await mapSeries(entryArr, (i) => db1.add('hello' + i))

      // Open the second database
      options = Object.assign({}, options, { path: dbPath2, sync: true })
      db2 = await orbitdb2.eventlog(db1.address.toString(), options)
      db4 = await orbitdb2.keyvalue(db3.address.toString(), options)

      // Listen for the 'replicated' events and check that all the entries
      // were replicated to the second database
      return new Promise(async (resolve, reject) => {
        db4.events.on('replicated', (address, hash, entry) => {
          reject(new Error("Should not receive the 'replicated' event!"))
        })

        // Can't check this for now as db1 might've sent the heads to db2
        // before we subscribe to the event
        db2.events.on('replicate.progress', (address, hash, entry) => {
          try {
            // Check that the head we received from the first peer is the latest
            assert.equal(entry.payload.op, 'ADD')
            assert.equal(entry.payload.key, null)
            assert.notEqual(entry.payload.value.indexOf('hello'), -1)
            assert.notEqual(entry.clock, null)
          } catch (e) {
            reject(e)
          }
        })

        db2.events.on('replicated', (address) => {
          try {
            const result1 = db1.iterator({ limit: -1 }).collect()
            const result2 = db2.iterator({ limit: -1 }).collect()
            // Make sure we have all the entries
            if (result1.length === entryCount && result2.length === entryCount) {
              assert.deepEqual(result1, result2)
              resolve()
            }
          } catch (e) {
            reject(e)
          }
        })
      })
    })
  })
})
