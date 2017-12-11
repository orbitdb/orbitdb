'use strict'

const assert = require('assert')
const rmrf = require('rimraf')
const OrbitDB = require('../src/OrbitDB')

// Include test utilities
const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs,
} = require('./utils')

const dbPath = './orbitdb/tests/docstore'
const ipfsPath = './orbitdb/tests/docstore/ipfs'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Document Store (${API})`, function() {
    this.timeout(config.timeout)

    let ipfsd, ipfs, orbitdb1, db

    before(async () => {
      config.daemon1.repo = ipfsPath
      rmrf.sync(config.daemon1.repo)
      ipfsd = await startIpfs(API, config.daemon1)
      ipfs = ipfsd.api
      orbitdb1 = new OrbitDB(ipfs, dbPath + '/1')
    })

    after(async () => {
      if(orbitdb1) 
        await orbitdb1.stop()

      if (ipfsd) 
        await stopIpfs(ipfsd)
    })

    it('creates and opens a database', async () => {
      db = await orbitdb1.docstore('first doc database')
      assert.notEqual(db, null)
      assert.equal(db.type, 'docstore')
      assert.equal(db.dbname, 'first doc database')
    })

    describe('Default index \'_id\'', function() {
      beforeEach(async () => {
        const options = {
          replicate: false,
          maxHistory: 0,
          path: dbPath,
        }
        db = await orbitdb1.docstore(config.dbname, options)
      })

      afterEach(async () => {
        await db.drop()
      })

      it('put', async () => {
        const doc = { _id: 'hello world', doc: 'all the things'}
        await db.put(doc)
        const value = db.get('hello world')
        assert.deepEqual(value, [doc])
      })

      it('get - partial term match', async () => {
        const doc1 = { _id: 'hello world', doc: 'some things'}
        const doc2 = { _id: 'hello universe', doc: 'all the things'}
        const doc3 = { _id: 'sup world', doc: 'other things'}
        await db.put(doc1)
        await db.put(doc2)
        await db.put(doc3)
        const value = db.get('hello')
        assert.deepEqual(value, [doc1, doc2])
      })

      it('get after delete', async () => {
        const doc1 = { _id: 'hello world', doc: 'some things'}
        const doc2 = { _id: 'hello universe', doc: 'all the things'}
        const doc3 = { _id: 'sup world', doc: 'other things'}
        await db.put(doc1)
        await db.put(doc2)
        await db.put(doc3)
        await db.del('hello universe')
        const value1 = db.get('hello')
        const value2 = db.get('sup')
        assert.deepEqual(value1, [doc1])
        assert.deepEqual(value2, [doc3])
      })

      it('put updates a value', async () => {
        const doc1 = { _id: 'hello world', doc: 'all the things'}
        const doc2 = { _id: 'hello world', doc: 'some of the things'}
        await db.put(doc1)
        await db.put(doc2)
        const value = db.get('hello')
        assert.deepEqual(value, [doc2])
      })

      it('query', async () => {
        const doc1 = { _id: 'hello world', doc: 'all the things', views: 17}
        const doc2 = { _id: 'sup world', doc: 'some of the things', views: 10}
        const doc3 = { _id: 'hello other world', doc: 'none of the things', views: 5}
        const doc4 = { _id: 'hey universe', doc: ''}

        await db.put(doc1)
        await db.put(doc2)
        await db.put(doc3)
        await db.put(doc4)

        const value1 = db.query((e) => e.views > 5)
        const value2 = db.query((e) => e.views > 10)
        const value3 = db.query((e) => e.views > 17)

        assert.deepEqual(value1, [doc1, doc2])
        assert.deepEqual(value2, [doc1])
        assert.deepEqual(value3, [])
      })

      it('query after delete', async () => {
        const doc1 = { _id: 'hello world', doc: 'all the things', views: 17}
        const doc2 = { _id: 'sup world', doc: 'some of the things', views: 10}
        const doc3 = { _id: 'hello other world', doc: 'none of the things', views: 5}
        const doc4 = { _id: 'hey universe', doc: ''}

        await db.put(doc1)
        await db.put(doc2)
        await db.put(doc3)
        await db.del('hello world')
        await db.put(doc4)
        const value1 = db.query((e) => e.views >= 5)
        const value2 = db.query((e) => e.views >= 10)
        assert.deepEqual(value1, [doc2, doc3])
        assert.deepEqual(value2, [doc2])
      })
    })

    describe('Specified index', function() {
      beforeEach(async () => {
        const options = { 
          indexBy: 'doc', 
          replicate: false, 
          maxHistory: 0 
        }
        db = await orbitdb1.docstore(config.dbname, options)
      })

      afterEach(async () => {
        await db.drop()
      })

      it('put', async () => {
        const doc = { _id: 'hello world', doc: 'all the things'}
        await db.put(doc)
        const value = db.get('all')
        assert.deepEqual(value, [doc])
      })

      it('get - matches specified index', async () => {
        const doc1 = { _id: 'hello world', doc: 'all the things'}
        const doc2 = { _id: 'hello world', doc: 'some things'}
        await db.put(doc1)
        await db.put(doc2)
        const value1 = db.get('all')
        const value2 = db.get('some')
        assert.deepEqual(value1, [doc1])
        assert.deepEqual(value2, [doc2])
      })
    })
  })
})
