'use strict'

const assert = require('assert')
const mapSeries = require('p-map-series')
const fs = require('fs-extra')
const path = require('path')
const rmrf = require('rimraf')
const levelup = require('levelup')
const leveldown = require('leveldown')
const OrbitDB = require('../src/OrbitDB')
const OrbitDBAddress = require('../src/orbit-db-address')
const io = require('orbit-db-io')
const IPFS = require('ipfs')
const Identities = require('orbit-db-identity-provider')
const migrate = require('localstorage-level-migration')
const Keystore = require('orbit-db-keystore')
const storage = require('orbit-db-storage-adapter')(leveldown)
storage.preCreate = async (directory, options) => {
  fs.mkdirSync(directory, { recursive: true })
}

// Include test utilities
const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs,
} = require('./utils')

const dbPath = './orbitdb/tests/v0'

const keyFixtures = './test/fixtures/keys/QmRfPsKJs9YqTot5krRibra4gPwoK4kghhU8iKWxBjGDDX'
const dbFixturesDir = './test/fixtures/v0/QmWDUfC4zcWJGgc9UHn1X3qQ5KZqBv4KCiCtjnpMmBT8JC/v0-db'
const ipfsFixturesDir = './test/fixtures/ipfs'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Backward-Compatibility - Open & Load (${API})`, function () {
    this.retries(1) // windows...
    this.timeout(config.timeout)

    let ipfsd, ipfs, orbitdb, db, address, store
    let localDataPath

    before(async () => {
      ipfsd = await startIpfs(API, config.daemon1)
      ipfs = ipfsd.api
      rmrf.sync(dbPath)
      
      const filterFunc = (src, dest) => {
        // windows has problems copying these files...
        return !(src.includes('LOG') || src.includes('LOCK'))
      }

      // copy data files to ipfs and orbitdb repos
      await fs.copy(path.join(ipfsFixturesDir, 'blocks'), path.join(ipfsd.path, 'blocks'))
      await fs.copy(path.join(ipfsFixturesDir, 'datastore'), path.join(ipfsd.path, 'datastore'), { filter: filterFunc })
      await fs.copy(dbFixturesDir, path.join(dbPath, ipfs._peerInfo.id._idB58String, 'cache'))

      store = await storage.createStore(path.join(dbPath, ipfs._peerInfo.id._idB58String, 'keys'))
      const keystore = new Keystore(store)

      let identity = await Identities.createIdentity({ id: ipfs._peerInfo.id._idB58String, migrate: migrate(keyFixtures), keystore })
      orbitdb = await OrbitDB.createInstance(ipfs, { directory: dbPath, identity, keystore })

    })

    after(async () => {
      await store.close()
      rmrf.sync(dbPath)
      if (orbitdb)
        await orbitdb.stop()

      if (ipfsd)
        await stopIpfs(ipfsd)
    })

    describe('Open & Load', function () {
      before(async () => {
        db = await orbitdb.open('/orbitdb/QmWDUfC4zcWJGgc9UHn1X3qQ5KZqBv4KCiCtjnpMmBT8JC/v0-db', { accessController: { type: 'legacy-ipfs', skipManifest: true } })
        const localFixtures = await db._cache.get('_localHeads')
        const remoteFixtures = await db._cache.get('_remoteHeads')
        db._cache.set(db.localHeadsPath, localFixtures)
        db._cache.set(db.remoteHeadsPath, remoteFixtures)
        await db.load()
      })

      beforeEach(async () => {
        if (process.platform === 'win32') {
          // for some reason Windows does not load the database correctly at the first time.
          // this is not a good solution but... it works.
          await db.load()
        }
      })

      after(async () => {
        if (db)
          await db.close()
      })

      it('open v0 orbitdb address', async () => {
        assert.notEqual(db, null)
      })

      it('database has the correct v0 address', async () => {
        assert.equal(db.address.toString().indexOf('/orbitdb'), 0)
        assert.equal(db.address.toString().indexOf('Qm'), 9)
        assert.equal(db.address.toString().indexOf('v0-db'), 56)
      })

      it('has the correct type', async () => {
        assert.equal(db.type, 'feed')
      })

      it('database has the correct access-controller', async () => {
        assert.equal(db.options.accessControllerAddress, '/ipfs/Qmc3S7aMSmH8oGmx7Zdp8UxVWcDyCq5o2H9qYFgT3GW6nM')
        assert.equal(db.access.type, 'legacy-ipfs')
        assert.strictEqual(db.access.write[0], '04b54f6ef529cd2dd2f9c6897a382c492222d42e57826269a38101ffe752aa07260ecd092a970d7eef08c4ddae2b7006ee25f07e4ab62fa5262ae3b51fdea29f78')
      })

      it('load v0 orbitdb address', async () => {
        assert.equal(db.all.length, 3)
      })

      it('allows migrated key to write', async () => {
        const hash = await db.add({ thing: 'new addition' })
        const newEntries = db.all.filter(e => e.v === 1)
        assert.equal(newEntries.length, 1)
        assert.strictEqual(newEntries[0].hash, hash)
      })
    })
  })
})
