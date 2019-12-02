'use strict'

const assert = require('assert')
const mapSeries = require('p-map-series')
const fs = require('fs-extra')
const path = require('path')
const rmrf = require('rimraf')
const levelup = require('levelup')
const leveldown = require('leveldown')
const Zip = require('adm-zip')
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

const dbPath = path.join('./orbitdb', 'tests', 'v0')
const dbFixturesDir = path.join('./test', 'fixtures', 'v0', 'QmWDUfC4zcWJGgc9UHn1X3qQ5KZqBv4KCiCtjnpMmBT8JC', 'v0-db')
const keyFixtures = path.join('./test', 'fixtures', 'keys','QmRfPsKJs9YqTot5krRibra4gPwoK4kghhU8iKWxBjGDDX')

const ipfsFixtures = path.join('./test', 'fixtures', 'ipfs.zip')
const ipfsFixturesDir = path.join('./test', 'fixtures', 'ipfs')

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Backward-Compatibility - Open & Load (${API})`, function () {
    this.retries(1) // windows...
    this.timeout(config.timeout)

    let ipfsd, ipfs, orbitdb, db, address, keystore
    let localDataPath

    before(async () => {
      ipfsd = await startIpfs(API, config.daemon1)
      ipfs = ipfsd.api
      rmrf.sync(dbPath)


      const zip = new Zip(ipfsFixtures)
      await zip.extractAllToAsync(path.join('./test', 'fixtures'), true)

      const filterFunc = (src, dest) => {
        // windows has problems copying these files...
        return !(src.includes('LOG') || src.includes('LOCK'))
      }

      // copy data files to ipfs and orbitdb repos
      await fs.copy(path.join(ipfsFixturesDir, 'blocks'), path.join(ipfsd.path, 'blocks'))
      await fs.copy(path.join(ipfsFixturesDir, 'datastore'), path.join(ipfsd.path, 'datastore'), { filter: filterFunc })

      const store = await storage.createStore(path.join(dbPath, ipfs._peerInfo.id._idB58String, 'keys'))
      keystore = new Keystore(store)

      let identity = await Identities.createIdentity({ id: ipfs._peerInfo.id._idB58String, migrate: migrate(keyFixtures), keystore })
      orbitdb = await OrbitDB.createInstance(ipfs, { identity, keystore })

    })

    after(async () => {
      await keystore.close()
      if (orbitdb)
        await orbitdb.stop()

      if (ipfsd)
        await stopIpfs(ipfsd)

      rmrf.sync(ipfsFixturesDir)
    })

    describe('Open & Load - V0 entries', function () {

      before(async () => {
        await fs.copy(dbFixturesDir, dbPath)
        db = await orbitdb.open('/orbitdb/QmWDUfC4zcWJGgc9UHn1X3qQ5KZqBv4KCiCtjnpMmBT8JC/v0-db', { directory: dbPath, accessController: { type: 'legacy-ipfs', skipManifest: true } })
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
        rmrf.sync(dbPath)
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
        const newEntries = db.all.filter(e => e.v > 0)
        assert.equal(newEntries.length, 1)
        assert.strictEqual(newEntries[0].hash, hash)
      })
    })

    describe('Open & Load - V1 entries', function () {
      const dbPath2 = './orbitdb/tests/v1'
      const dbv1Fix = './test/fixtures/v1/QmZrWipUpBNx5VjBTESCeJBQuj4rWahZMz8CV8hBjdJAec/cache'
      const v1Address = '/orbitdb/zdpuAqpKBwd7ojM77o3rRVKA1PAEQBnWoRASY3ugJ7zqnM6z7/v1-entries'
      before(async () => {
        await fs.copy(dbv1Fix, dbPath2)
        db = await orbitdb.open(v1Address, { directory: dbPath2 })
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
        rmrf.sync(dbPath2)
        if (db)
          await db.close()
      })

      it('open v1 orbitdb address', async () => {
        assert.notEqual(db, null)
      })

      it('database has the correct v1 address', async () => {
        assert.equal(db.address.toString().indexOf('/orbitdb'), 0)
        assert.equal(db.address.toString().indexOf('zd'), 9)
        assert.equal(db.address.toString().indexOf('v1-entries'), 59)
      })

      it('has the correct type', async () => {
        assert.equal(db.type, 'feed')
      })

      it('database has the correct access-controller', async () => {
        assert.equal(db.access.type, 'ipfs')
        assert.equal(db.options.accessControllerAddress, '/ipfs/zdpuAsYRtJLLLDibnmxWPzyRGJEqtjmJP27ppKWcLreNGGTFN')
        assert.strictEqual(db.access.write[0], '*')
      })

      it('load v1 orbitdb address', async () => {
        assert.equal(db.all.length, 100)
      })

      it('allows adding new entry', async () => {
        const hash = await db.add('new entry')
        const newEntries = db.all.filter(e => e.v > 1)
        assert.equal(newEntries.length, 1)
        assert.strictEqual(newEntries[0].hash, hash)
      })

      it('reopens db after adding new entry', async () => {
        await db.close()
        db = await orbitdb.open(v1Address, { directory: dbPath2 })
        assert.notEqual(db, null)
        await db.load()
        assert.equal(db.all.length, 101)
        const newEntries = db.all.filter(e => e.v > 1)
        assert.equal(newEntries.length, 1)
      })
    })
  })
})
