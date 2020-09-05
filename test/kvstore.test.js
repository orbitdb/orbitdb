'use strict'

const assert = require('assert')
const rmrf = require('rimraf')
const path = require('path')
const OrbitDB = require('../src/OrbitDB')

// Include test utilities
const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs,
} = require('orbit-db-test-utils')

const dbPath = './orbitdb/tests/kvstore'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Key-Value Database (${API})`, function() {
    this.timeout(config.timeout)

    let ipfsd, ipfs, orbitdb1

    before(async () => {
      rmrf.sync(dbPath)
      ipfsd = await startIpfs(API, config.daemon1)
      ipfs = ipfsd.api
      orbitdb1 = await OrbitDB.createInstance(ipfs, { directory: path.join(dbPath, '1') })
    })

    after(() => {
      setTimeout(async () => {
        await orbitdb1.stop()
        await stopIpfs(ipfsd)
      }, 0)
    })

    it('creates and opens a database', async () => {
      const db = await orbitdb1.keyvalue('first kv database')
      assert.notEqual(db, null)
      assert.equal(db.type, 'keyvalue')
      assert.equal(db.dbname, 'first kv database')
      await db.drop()
    })

    it('put', async () => {
      const db = await orbitdb1.keyvalue('first kv database')
      await db.put('key1', 'hello1')
      const value = db.get('key1')
      assert.equal(value, 'hello1')
      await db.drop()
    })

    it('get', async () => {
      const db = await orbitdb1.keyvalue('first kv database')
      await db.put('key1', 'hello2')
      const value = db.get('key1')
      assert.equal(value, 'hello2')
      await db.drop()
    })

    it('put updates a value', async () => {
      const db = await orbitdb1.keyvalue('first kv database')
      await db.put('key1', 'hello3')
      await db.put('key1', 'hello4')
      const value = db.get('key1')
      assert.equal(value, 'hello4')
      await db.drop()
    })

    it('set is an alias for put', async () => {
      const db = await orbitdb1.keyvalue('first kv database')
      await db.set('key1', 'hello5')
      const value = db.get('key1')
      assert.equal(value, 'hello5')
      await db.drop()
    })

    it('put/get - multiple keys', async () => {
      const db = await orbitdb1.keyvalue('first kv database')
      await db.put('key1', 'hello1')
      await db.put('key2', 'hello2')
      await db.put('key3', 'hello3')
      const v1 = db.get('key1')
      const v2 = db.get('key2')
      const v3 = db.get('key3')
      assert.equal(v1, 'hello1')
      assert.equal(v2, 'hello2')
      assert.equal(v3, 'hello3')
      await db.drop()
    })

    it('deletes a key', async () => {
      const db = await orbitdb1.keyvalue('first kv database')
      await db.put('key1', 'hello!')
      await db.del('key1')
      const value = db.get('key1')
      assert.equal(value, null)
      await db.drop()
    })

    it('deletes a key after multiple updates', async () => {
      const db = await orbitdb1.keyvalue('first kv database')
      await db.put('key1', 'hello1')
      await db.put('key1', 'hello2')
      await db.put('key1', 'hello3')
      await db.del('key1')
      const value = db.get('key1')
      assert.equal(value, null)
      await db.drop()
    })

    it('get - integer value', async () => {
      const db = await orbitdb1.keyvalue('first kv database')
      const val = 123
      await db.put('key1', val)
      const v1 = db.get('key1')
      assert.equal(v1, val)
      await db.drop()
    })

    it('get - object value', async () => {
      const db = await orbitdb1.keyvalue('first kv database')
      const val = { one: 'first', two: 2 }
      await db.put('key1', val)
      const v1 = db.get('key1')
      assert.deepEqual(v1, val)
      await db.drop()
    })

    it('get - array value', async () => {
      const db = await orbitdb1.keyvalue('first kv database')
      const val = [1, 2, 3, 4, 5]
      await db.put('key1', val)
      const v1 = db.get('key1')
      assert.deepEqual(v1, val)
      await db.drop()
    })
  })
})
