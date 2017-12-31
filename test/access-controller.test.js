'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const rmrf = require('rimraf')
const mapSeries = require('p-map-series')
const levelup = require('levelup')
const leveldown = require('leveldown')
const OrbitDB = require('../src/OrbitDB')
const OrbitDBAddress = require('../src/orbit-db-address')
const config = require('./utils/config')
const startIpfs = require('./utils/start-ipfs')

const dbPath = './orbitdb/tests/create-open'
const ipfsPath = './orbitdb/tests/create-open/ipfs'

describe.skip('orbit-db - Access Controller', function() {
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
  })

  describe('Access Controller', function() {
    afterEach(async () => {
      if (db) {
        await db.drop()
        // await db.close()
      }
    })

    it('creates an access controller and adds ourselves as writer by default', async () => {
      db = await orbitdb.create('fourth', 'feed')
      assert.deepEqual(db.access.write, [orbitdb.key.getPublic('hex')])
    })

    it('creates an access controller and adds writers', async () => {
      db = await orbitdb.create('fourth', 'feed', { write: ['another-key', 'yet-another-key', orbitdb.key.getPublic('hex')] })
      assert.deepEqual(db.access.write, ['another-key', 'yet-another-key', orbitdb.key.getPublic('hex')])
    })

    it('creates an access controller and doesn\'t add an admin', async () => {
      db = await orbitdb.create('sixth', 'feed')
      assert.deepEqual(db.access.admin, [])
    })

    it('creates an access controller and doesn\'t add read access keys', async () => {
      db = await orbitdb.create('seventh', 'feed', { read: ['one', 'two'] })
      assert.deepEqual(db.access.read, [])
    })
  })
})
