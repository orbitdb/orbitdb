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

describe.only('orbit-db - Access Controller', function() {
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

  describe('Access Controller (Default)', function() {
    afterEach(async () => {
      if (db) {
        await db.drop()
      }
    })

    it('returns an error for unknown controller type', async () => {
      let err
      try {
        await orbitdb.create('fourth', 'feed', { accessControllerType: 'wedonthavethistype' })
      } catch (e) {
        err = e
      }
      assert.equal(err, 'Error: Unsupported access controller type \'wedonthavethistype\'')
    })

    it('creates an access controller and adds ourselves as writer by default', async () => {
      db = await orbitdb.create('fourth', 'feed')
      assert.deepEqual(db.access.capabilities.write, [orbitdb.key.getPublic('hex')])
    })

    it('creates an access controller and adds writers', async () => {
      const keys = [
        'another-key', 
        'yet-another-key', 
        orbitdb.key.getPublic('hex')
      ]

      db = await orbitdb.create('fourth', 'feed', { write: keys })
      assert.deepEqual(db.access.capabilities.write, keys)
    })

    it('creates an access controller and doesn\'t add an admin', async () => {
      db = await orbitdb.create('sixth', 'feed')
      assert.equal(db.access.capabilities.admin, undefined)
    })

    it('creates an access controller and doesn\'t add read access keys', async () => {
      db = await orbitdb.create('seventh', 'feed', { read: ['one', 'two'] })
      assert.equal(db.access.capabilities.read, undefined)
    })
  })
})
