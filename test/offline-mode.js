'use strict'

const fs = require('fs')
const path = require('path')
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
} = require('orbit-db-test-utils')

const dbPath1 = './orbitdb/tests/offline/db1'
const dbPath2 = './orbitdb/tests/offline/db2'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Offline mode (${API})`, function() {
    this.timeout(config.timeout)

    let ipfsd1, ipfsd2, ipfs1, ipfs2, orbitdb, db, keystore
    let identity1, identity2
    let localDataPath

    before(async () => {
      rmrf.sync('./orbitdb/tests/offline')
      rmrf.sync(dbPath1)
      rmrf.sync(dbPath2)
      ipfsd1 = await startIpfs(API, config.daemon1)
      ipfsd2 = await startIpfs(API, config.daemon2)
      ipfs1 = ipfsd1.api
      ipfs2 = ipfsd2.api
    })

    after(async () => {
      if(orbitdb)
        await orbitdb.stop()

      if (ipfsd1)
        await stopIpfs(ipfsd1)
      if (ipfsd2)
        await stopIpfs(ipfsd2)
    })

    it('starts in offline mode', async () => {
      orbitdb = await OrbitDB.createInstance(ipfs1, { id: 'A', offline: true, directory: dbPath1 })
      assert.equal(orbitdb._pubsub, null)
      await orbitdb.stop()
    })

    it('does not start in offline mode', async () => {
      orbitdb = await OrbitDB.createInstance(ipfs1, { offline: false, directory: dbPath1 })
      assert.notEqual(orbitdb._pubsub, null)
      await orbitdb.stop()
    })

    it('does not start in offline mode - default', async () => {
      orbitdb = await OrbitDB.createInstance(ipfs1, { directory: dbPath1 })
      assert.notEqual(orbitdb._pubsub, null)
      await orbitdb.stop()
    })

    it('throws error if no `id` passed in offline mode', async () => {
      let err
      try {
        orbitdb = await OrbitDB.createInstance(ipfs1, { offline: true, directory: dbPath1 })
      } catch (e) {
        err = e.message
      }
      assert.equal(err, 'Offline mode requires passing an `id` in the options')
      await orbitdb.stop()
    })
  })
})
