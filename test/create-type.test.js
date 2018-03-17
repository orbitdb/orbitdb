'use strict'

const assert = require('assert')
const config = require('./utils/config')
const DocumentStore = require('orbit-db-docstore')
const OrbitDB = require('../src/OrbitDB')
const rmrf = require('rimraf')
const startIpfs = require('./utils/start-ipfs')

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

describe('orbit-db - Create custom type', function () {
  this.timeout(config.timeout)

  let ipfs, orbitdb

  before(async () => {
    config.daemon1.repo = ipfsPath
    rmrf.sync(config.daemon1.repo)
    rmrf.sync(dbPath)
    ipfs = await startIpfs(config.daemon1)
    orbitdb = new OrbitDB(ipfs, dbPath)
  })

  after(async () => {
    if (orbitdb) await orbitdb.stop()
    if (ipfs) await ipfs.stop()
  })

  describe('addDatabaseType', function () {
    it('should have the correct custom type', async () => {
      OrbitDB.addDatabaseType(CustomStore.type, CustomStore)
      let store = await orbitdb.create(dbPath, CustomStore.type)
      assert.equal(store._type, CustomStore.type)
    })

    it('cannot be overwritten', async () => {
      try {
        OrbitDB.addDatabaseType(CustomStore.type, CustomStore)
        throw new Error('This should not run.')
      } catch (e) {
        assert(e.message.indexOf('already exists') > -1)
      }
    })
  })
})
