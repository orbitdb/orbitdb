'use strict'

const assert = require('assert')
const rmrf = require('rimraf')
const path = require('path')
const OrbitDB = require('../src/OrbitDB')
const CustomCache = require('orbit-db-cache')
// Include test utilities
const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs,
  CustomTestCache,
  databases,
} = require('./utils')

const dbPath = './orbitdb/tests/customKeystore'
const ipfsPath = './orbitdb/tests/customKeystore/ipfs'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Use a Custom Cache (${API})`, function() {
    this.timeout(20000)

    let ipfsd, ipfs, orbitdb1

    before(async () => {
      config.daemon1.repo = ipfsPath
      rmrf.sync(config.daemon1.repo)
      rmrf.sync(dbPath)
      ipfsd = await startIpfs(API, config.daemon1)
      ipfs = ipfsd.api
      orbitdb1 = await OrbitDB.createInstance(ipfs, {
        directory: path.join(dbPath, '1'),
        cache: CustomTestCache
      })
    })

    after(async () => {
      if(orbitdb1)
        await orbitdb1.stop()

      if (ipfsd)
        await stopIpfs(ipfsd)
    })

    describe('allows orbit to use a custom cache with different store types', function() {
      databases.forEach(async (database) => {
        it(database.type + ' allows custom keystore', async () => {
          const db1 = await database.create(orbitdb1, 'custom-keystore')
          await database.tryInsert(db1)

          assert.deepEqual(database.getTestValue(db1), database.expectedValue)

          await db1.close()
        })
      })
    })
  })
})
