'use strict'

const assert = require('assert')
const rmrf = require('rimraf')
const path = require('path')
const OrbitDB = require('../src/OrbitDB')
const CustomCache = require('orbit-db-cache')
const localdown = require('localstorage-down')
const storage = require("orbit-db-storage-adapter")(localdown)

// Include test utilities
const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs,
} = require('orbit-db-test-utils')

const {
  databases
} = require('./utils')

const dbPath = './orbitdb/tests/customKeystore'
const ipfsPath = './orbitdb/tests/customKeystore/ipfs'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Use a Custom Cache (${API})`, function() {
    this.timeout(20000)

    let ipfsd, ipfs, orbitdb1, store

    before(async () => {
      store = await storage.createStore("local")
      const cache = new CustomCache(store)

      config.daemon1.repo = ipfsPath
      rmrf.sync(config.daemon1.repo)
      rmrf.sync(dbPath)
      ipfsd = await startIpfs(API, config.daemon1)
      ipfs = ipfsd.api
      orbitdb1 = await OrbitDB.createInstance(ipfs, {
        directory: path.join(dbPath, '1'),
        cache: cache
      })
    })

    after(async () => {
      await orbitdb1.stop()
      await stopIpfs(ipfsd)
    })

    describe('allows orbit to use a custom cache with different store types', function() {
      for (let database of databases) {
        it(database.type + ' allows custom cache', async () => {
          const db1 = await database.create(orbitdb1, 'custom-keystore')
          await database.tryInsert(db1)

          assert.deepEqual(database.getTestValue(db1), database.expectedValue)
          await db1.close()
        })
      }
    })
  })
})
