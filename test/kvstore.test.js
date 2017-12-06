'use strict'

const assert = require('assert')
const rmrf = require('rimraf')
const OrbitDB = require('../src/OrbitDB')
const config = require('./utils/config')
const startIpfs = require('./utils/start-ipfs')

const dbPath = './orbitdb/tests/kvstore'
const ipfsPath = './orbitdb/tests/kvstore/ipfs'

describe('orbit-db - Key-Value Store', function() {
  this.timeout(config.timeout)

  let ipfs, orbitdb1, db

  before(async () => {
    config.daemon1.repo = ipfsPath
    rmrf.sync(config.daemon1.repo)
    rmrf.sync(dbPath)
    ipfs = await startIpfs(config.daemon1)
    orbitdb1 = new OrbitDB(ipfs, dbPath + '/1')
  })

  after(async () => {
    if(orbitdb1) 
      await orbitdb1.stop()

    if (ipfs)
      await ipfs.stop()
  })

  beforeEach(async () => {
    db = await orbitdb1.kvstore(config.dbname, { path: dbPath })
  })

  afterEach(async () => {
    await db.drop()
  })

  it('creates and opens a database', async () => {
    db = await orbitdb1.keyvalue('first kv database')
    db = await orbitdb1.keyvalue('first kv database')
  })

  it('put', async () => {
    await db.put('key1', 'hello1')
    const value = db.get('key1')
    assert.equal(value, 'hello1')
  })

  it('get', async () => {
    await db.put('key1', 'hello2')
    const value = db.get('key1')
    assert.equal(value, 'hello2')
  })

  it('put updates a value', async () => {
    await db.put('key1', 'hello3')
    await db.put('key1', 'hello4')
    const value = db.get('key1')
    assert.equal(value, 'hello4')
  })

  it('set is an alias for put', async () => {
    await db.set('key1', 'hello5')
    const value = db.get('key1')
    assert.equal(value, 'hello5')
  })

  it('put/get - multiple keys', async () => {
    await db.put('key1', 'hello1')
    await db.put('key2', 'hello2')
    await db.put('key3', 'hello3')
    const v1 = db.get('key1')
    const v2 = db.get('key2')
    const v3 = db.get('key3')
    assert.equal(v1, 'hello1')
    assert.equal(v2, 'hello2')
    assert.equal(v3, 'hello3')
  })

  it('deletes a key', async () => {
    await db.put('key1', 'hello!')
    await db.del('key1')
    const value = db.get('key1')
    assert.equal(value, null)
  })

  it('deletes a key after multiple updates', async () => {
    await db.put('key1', 'hello1')
    await db.put('key1', 'hello2')
    await db.put('key1', 'hello3')
    await db.del('key1')
    const value = db.get('key1')
    assert.equal(value, null)
  })

  it('get - integer value', async () => {
    const val = 123
    await db.put('key1', val)
    const v1 = db.get('key1')
    assert.equal(v1, val)
  })

  it('get - object value', async () => {
    const val = { one: 'first', two: 2 }
    await db.put('key1', val)
    const v1 = db.get('key1')
    assert.deepEqual(v1, val)
  })

  it('get - array value', async () => {
    const val = [1, 2, 3, 4, 5]
    await db.put('key1', val)
    const v1 = db.get('key1')
    assert.deepEqual(v1, val)
  })
})
