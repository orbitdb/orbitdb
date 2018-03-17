'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const rmrf = require('rimraf')
const OrbitDB = require('../src/OrbitDB')
const config = require('./utils/config')
const startIpfs = require('./utils/start-ipfs')

const dbPath = './orbitdb/tests/drop'
const ipfsPath = './orbitdb/tests/drop/ipfs'

describe('orbit-db - Drop Database', function() {
  this.timeout(config.timeout)

  let ipfs, orbitdb, db, address
  let localDataPath

  before(async () => {
    config.daemon1.repo = ipfsPath
    rmrf.sync(config.daemon1.repo)
    rmrf.sync(dbPath)
    ipfs = await startIpfs(config.daemon1)
    orbitdb = new OrbitDB(ipfs, dbPath)
  })

  after(async () => {
    if(orbitdb) 
      await orbitdb.stop()

    if (ipfs)
      await ipfs.stop()

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
