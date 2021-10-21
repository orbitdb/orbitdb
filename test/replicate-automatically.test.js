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
} = require('orbit-db-test-utils')

const dbPath1 = './orbitdb/tests/replicate-automatically/1'
const dbPath2 = './orbitdb/tests/replicate-automatically/2'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Automatic Replication (${API})`, function() {
    this.timeout(config.timeout)

    let ipfsd1, ipfsd2, ipfs1, ipfs2
    let orbitdb1, orbitdb2, db1, db2, db3, db4

    before(async () => {
      rmrf.sync('./orbitdb')
      rmrf.sync(dbPath1)
      rmrf.sync(dbPath2)
      ipfsd1 = await startIpfs(API, config.daemon1)
      ipfsd2 = await startIpfs(API, config.daemon2)
      ipfs1 = ipfsd1.api
      ipfs2 = ipfsd2.api
      orbitdb1 = await OrbitDB.createInstance(ipfs1, { directory: dbPath1 })
      orbitdb2 = await OrbitDB.createInstance(ipfs2, { directory: dbPath2 })

      let options = {}
      // Set write access for both clients
      options.write = [
        orbitdb1.identity.publicKey,
        orbitdb2.identity.publicKey
      ]

      options = Object.assign({}, options)
      db1 = await orbitdb1.eventlog('replicate-automatically-tests', options)
      db3 = await orbitdb1.keyvalue('replicate-automatically-tests-kv', options)
    })

    after(async () => {
      if (orbitdb1) {
        await orbitdb1.stop()
      }

      if (orbitdb2) {
        await orbitdb2.stop()
      }

      if (ipfsd1) {
        await stopIpfs(ipfsd1)
      }

      if (ipfs2) {
        await stopIpfs(ipfsd2)
      }

      rmrf.sync(dbPath1)
      rmrf.sync(dbPath2)
    })

    it('starts replicating the database when peers connect', async () => {
      const isLocalhostAddress = (addr) => addr.toString().includes('127.0.0.1')
      await connectPeers(ipfs1, ipfs2, { filter: isLocalhostAddress })
      console.log('Peers connected')

      const entryCount = 33
      const entryArr = []

      // Create the entries in the first database
      for (let i = 0; i < entryCount; i++) {
        entryArr.push(i)
      }

      await mapSeries(entryArr, (i) => db1.add('hello' + i))

      // Open the second database
      db2 = await orbitdb2.eventlog(db1.address.toString())
      db4 = await orbitdb2.keyvalue(db3.address.toString())

      // Listen for the 'replicated' events and check that all the entries
      // were replicated to the second database
      return new Promise((resolve, reject) => {
        // Check if db2 was already replicated
        let all = db2.iterator({ limit: -1 }).collect().length
        // Run the test asserts below if replication was done
        let finished = (all === entryCount)

        db3.events.on('replicated', (address, hash, entry) => {
          reject(new Error("db3 should not receive the 'replicated' event!"))
        })

        db4.events.on('replicated', (address, hash, entry) => {
          reject(new Error("db4 should not receive the 'replicated' event!"))
        })

        db2.events.on('replicated', (address, length) => {
          // Once db2 has finished replication, make sure it has all elements
          // and process to the asserts below
          all = db2.iterator({ limit: -1 }).collect().length
          finished = (all === entryCount)
        })

        try {
          const timer = setInterval(() => {
            if (finished) {
              clearInterval(timer)
              const result1 = db1.iterator({ limit: -1 }).collect()
              const result2 = db2.iterator({ limit: -1 }).collect()
              assert.equal(result1.length, result2.length)
              assert.deepEqual(result1, result2)
              resolve()
            }
          }, 1000)
        } catch (e) {
          reject(e)
        }
      })
    })
  })
})
