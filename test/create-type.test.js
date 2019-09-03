'use strict'

const assert = require('assert')
const rmrf = require('rimraf')
const DocumentStore = require('orbit-db-docstore')
const OrbitDB = require('../src/OrbitDB')

// Include test utilities
const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs,
} = require('orbit-db-test-utils')

const dbPath = './orbitdb/tests/create-open'
const ipfsPath = './orbitdb/tests/create-open/ipfs'

class CustomStore extends DocumentStore {
  constructor (ipfs, id, dbname, options) {
    super(ipfs, id, dbname, options)
    this._type = CustomStore.type
  }

  static get type () {
    return 'custom'
  }
}

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Create Custom Database Type (${API})`, function() {
    this.timeout(config.timeout)

    let ipfs, orbitdb

    before(async () => {
      config.daemon1.repo = ipfsPath
      rmrf.sync(config.daemon1.repo)
      rmrf.sync(dbPath)
      ipfs = await startIpfs(API, config.daemon1)
      orbitdb = await OrbitDB.createInstance(ipfs, { directory: dbPath })
    })

    after(async () => {
      if (orbitdb) await orbitdb.stop()
      if (ipfs) await stopIpfs(ipfs)
      // Remove the added custom database type from OrbitDB
      // between js-ipfs and js-ipfs-api tests
      delete OrbitDB.getDatabaseTypes()[CustomStore.type]
    })

    describe('addDatabaseType', function () {
      it.skip('should have the correct custom type', async () => {
        OrbitDB.addDatabaseType(CustomStore.type, CustomStore)
        let store = await orbitdb.create(dbPath, CustomStore.type)
        assert.equal(store._type, CustomStore.type)
      })

      it.skip('cannot be overwritten', async () => {
        try {
          OrbitDB.addDatabaseType(CustomStore.type, CustomStore)
          throw new Error('This should not run.')
        } catch (e) {
          assert(e.message.indexOf('already exists') > -1)
        }
      })
    })
  })
})
