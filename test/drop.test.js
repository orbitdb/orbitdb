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
} = require('./utils')

const dbPath = './orbitdb/tests/drop'
const ipfsPath = './orbitdb/tests/drop/ipfs'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Drop Database (${API})`, function() {
    this.timeout(config.timeout)

    let ipfsd, ipfs, orbitdb, db, address
    let localDataPath

    before(async () => {
      config.daemon1.repo = ipfsPath
      rmrf.sync(config.daemon1.repo)
      rmrf.sync(dbPath)
      ipfsd = await startIpfs(API, config.daemon1)
      ipfs = ipfsd.api
      orbitdb = new OrbitDB(ipfs, dbPath)
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
        localDataPath = path.join(dbPath, db.address.root, db.address.path)
        assert.equal(fs.existsSync(localDataPath), true)
      })

      it('removes local database files', async () => {
        await db.drop()
        assert.equal(fs.existsSync(localDataPath), false)
      })    
    })
  })
})
