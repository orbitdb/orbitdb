'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const rmrf = require('rimraf')
const OrbitDB = require('../src/OrbitDB')

// Include test utilities
const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs,
} = require('orbit-db-test-utils')

const dbPath = './orbitdb/tests/drop'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Drop Database (${API})`, function() {
    this.timeout(config.timeout)

    let ipfsd, ipfs, orbitdb, db, address
    let localDataPath

    before(async () => {
      rmrf.sync(dbPath)
      ipfsd = await startIpfs(API, config.daemon1)
      ipfs = ipfsd.api
      orbitdb = await OrbitDB.createInstance(ipfs, { directory: dbPath })
    })

    after(async () => {
      if(orbitdb)
        await orbitdb.stop()

      if (ipfsd)
        await stopIpfs(ipfsd)

      rmrf.sync(dbPath)
    })

    describe('Drop', function() {
      before(async () => {
        db = await orbitdb.create('first', 'feed')
        localDataPath = path.join(dbPath)
        assert.equal(fs.existsSync(localDataPath), true)
      })

      it('removes local database cache', async () => {
        await db.drop()
        await db._cache.open()
        assert.equal(await db._cache.get(db.localHeadsPath), undefined)
        assert.equal(await db._cache.get(db.remoteHeadsPath), undefined)
        assert.equal(await db._cache.get(db.snapshotPath), undefined)
        assert.equal(await db._cache.get(db.queuePath), undefined)
        assert.equal(await db._cache.get(db.manifestPath), undefined)
        await db._cache.close()
      })
    })
  })
})
