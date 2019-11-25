'use strict'

const fs = require('fs')
const assert = require('assert')
const mapSeries = require('p-map-series')
const rmrf = require('rimraf')
const OrbitDB = require('../src/OrbitDB')
const Identities = require('orbit-db-identity-provider')
const Keystore = require('orbit-db-keystore')
const leveldown = require('leveldown')
const storage = require('orbit-db-storage-adapter')(leveldown)

// Include test utilities
const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs,
} = require('./utils')

const keysPath = './orbitdb/identity/identitykeys'
const dbPath = './orbitdb/tests/change-identity'
const ipfsPath = './orbitdb/tests/change-identity/ipfs'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Set identities (${API})`, function() {
    this.timeout(config.timeout)

    let ipfsd, ipfs, orbitdb, db, keystore
    let identity1, identity2, identities
    let localDataPath

    before(async () => {
      config.daemon1.repo = ipfsPath
      rmrf.sync(config.daemon1.repo)
      rmrf.sync(dbPath)
      ipfsd = await startIpfs(API, config.daemon1)
      ipfs = ipfsd.api

      if(fs && fs.mkdirSync) fs.mkdirSync(keysPath, { recursive: true })

      identities = new Identities(keysPath)
      identity1 = await identities.createIdentity({ id: 'test-id1' })
      identity2 = await identities.createIdentity({ id: 'test-id2' })
      orbitdb = await OrbitDB.createInstance(ipfs, { directory: dbPath })
    })

    after(async () => {
      await identities.close()
      if(orbitdb)
        await orbitdb.stop()

      if (ipfsd)
        await stopIpfs(ipfsd)
    })

    beforeEach(async () => {
      let options = {}
      options.accessController = {
        write : [
          orbitdb.identity.id,
          identity1.id
        ]
      }
      options = Object.assign({}, options, { create: true, type: 'eventlog', overwrite: true, identities })
      db = await orbitdb.open('abc', options)
    })

    it('sets identity', async () => {
      assert.equal(db.identity, orbitdb.identity)
      db.setIdentity(identity1)
      assert.equal(db.identity, identity1)
    })

    it('writes with new identity with access', async () => {
      assert.equal(db.identity, orbitdb.identity)
      db.setIdentity(identity1)
      assert.equal(db.identity, identity1)
      let err
      try {
        await db.add({ hello: '1'})
      } catch (e) {
        err = e.message
      }
      assert.equal(err, null)
    })

    it('cannot write with new identity without access', async () => {
      assert.equal(db.identity, orbitdb.identity)
      db.setIdentity(identity2)
      assert.equal(db.identity, identity2)
      let err
      try {
        await db.add({ hello: '1'})
      } catch (e) {
        err = e.message
      }
      assert.equal(err, `Could not append entry, key "${identity2.id}" is not allowed to write to the log`)
    })
  })
})
