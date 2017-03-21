'use strict'

const assert = require('assert')
const rmrf = require('rimraf')
const IpfsNodeDaemon = require('ipfs-daemon/src/ipfs-node-daemon')
const IpfsNativeDaemon = require('ipfs-daemon/src/ipfs-native-daemon')
const OrbitDB = require('../src/OrbitDB')
const hasIpfsApiWithPubsub = require('./test-utils').hasIpfsApiWithPubsub
const config = require('./test-config')

config.daemons.forEach((IpfsDaemon) => {

  describe('orbit-db - Document Store', function() {
    this.timeout(config.timeout)

    let ipfs, client1, client2, db

    before(function (done) {
      rmrf.sync(config.defaultIpfsDirectory)
      rmrf.sync(config.defaultOrbitDBDirectory)
      ipfs = new IpfsDaemon()
      ipfs.on('error', done)
      ipfs.on('ready', () => {
        assert.equal(hasIpfsApiWithPubsub(ipfs), true)
        client1 = new OrbitDB(ipfs, 'A')
        client2 = new OrbitDB(ipfs, 'B')
        done()
      })
    })

    after(() => {
      if(client1) client1.disconnect()
      if(client2) client2.disconnect()
      ipfs.stop()
      rmrf.sync(config.defaultOrbitDBDirectory)
      rmrf.sync(config.defaultIpfsDirectory)
    })

    describe('Default index \'_id\'', function() {
      beforeEach(() => {
        db = client1.docstore(config.dbname, { replicate: false, maxHistory: 0 })
      })

      it('put', () => {
        const doc = { _id: 'hello world', doc: 'all the things'}
        return db.put(doc)
          .then(() => {
            const value = db.get('hello world')
            assert.deepEqual(value, [doc])
          })
      })

      it('get - partial term match', () => {
        const doc1 = { _id: 'hello world', doc: 'some things'}
        const doc2 = { _id: 'hello universe', doc: 'all the things'}
        const doc3 = { _id: 'sup world', doc: 'other things'}
        return db.put(doc1)
          .then(() => db.put(doc2))
          .then(() => db.put(doc3))
          .then(() => {
            const value = db.get('hello')
            assert.deepEqual(value, [doc1, doc2])
          })
      })

      it('get after delete', () => {
        const doc1 = { _id: 'hello world', doc: 'some things'}
        const doc2 = { _id: 'hello universe', doc: 'all the things'}
        const doc3 = { _id: 'sup world', doc: 'other things'}
        return db.put(doc1)
          .then(() => db.put(doc2))
          .then(() => db.put(doc3))
          .then(() => db.del('hello universe'))
          .then(() => {
            const value1 = db.get('hello')
            const value2 = db.get('sup')
            assert.deepEqual(value1, [doc1])
            assert.deepEqual(value2, [doc3])
          })
      })

      it('put updates a value', () => {
        const doc1 = { _id: 'hello world', doc: 'all the things'}
        const doc2 = { _id: 'hello world', doc: 'some of the things'}
        return db.put(doc1)
          .then(() => db.put(doc2))
          .then(() => {
              const value = db.get('hello')
              assert.deepEqual(value, [doc2])
          })
      })

      it('query', () => {
        const doc1 = { _id: 'hello world', doc: 'all the things', views: 17}
        const doc2 = { _id: 'sup world', doc: 'some of the things', views: 10}
        const doc3 = { _id: 'hello other world', doc: 'none of the things', views: 5}
        const doc4 = { _id: 'hey universe', doc: ''}

        return db.put(doc1)
          .then(() => db.put(doc2))
          .then(() => db.put(doc3))
          .then(() => db.put(doc4))
          .then(() => {
            const value1 = db.query((e) => e.views > 5)
            const value2 = db.query((e) => e.views > 10)
            const value3 = db.query((e) => e.views > 17)
            assert.deepEqual(value1, [doc1, doc2])
            assert.deepEqual(value2, [doc1])
            assert.deepEqual(value3, [])
          })
      })

      it('query after delete', () => {
        const doc1 = { _id: 'hello world', doc: 'all the things', views: 17}
        const doc2 = { _id: 'sup world', doc: 'some of the things', views: 10}
        const doc3 = { _id: 'hello other world', doc: 'none of the things', views: 5}
        const doc4 = { _id: 'hey universe', doc: ''}

        return db.put(doc1)
          .then(() => db.put(doc2))
          .then(() => db.put(doc3))
          .then(() => db.del('hello world'))
          .then(() => db.put(doc4))
          .then(() => {
            const value1 = db.query((e) => e.views >= 5)
            const value2 = db.query((e) => e.views >= 10)
            assert.deepEqual(value1, [doc2, doc3])
            assert.deepEqual(value2, [doc2])
          })
      })
    })

    describe('Specified index', function() {
      beforeEach(() => {
        db = client1.docstore(config.dbname, { indexBy: 'doc', replicate: false, maxHistory: 0 })
      })

      it('put', () => {
        const doc = { _id: 'hello world', doc: 'all the things'}
        return db.put(doc)
          .then(() => {
            const value = db.get('all')
            assert.deepEqual(value, [doc])
          })
      })

      it('get - matches specified index', () => {
        const doc1 = { _id: 'hello world', doc: 'all the things'}
        const doc2 = { _id: 'hello world', doc: 'some things'}

        return db.put(doc1)
          .then(() => db.put(doc2))
          .then(() => {
            const value1 = db.get('all')
            const value2 = db.get('some')
            assert.deepEqual(value1, [doc1])
            assert.deepEqual(value2, [doc2])
          })
      })
    })

    describe('Sync', function() {
      const doc1 = { _id: 'hello world', doc: 'all the things'}
      const doc2 = { _id: 'moi moi', doc: 'everything'}

      const options = { 
        replicate: false, 
        maxHistory: 0,
      }

      it('syncs databases', (done) => {
        const db1 = client1.docstore(config.dbname, options)
        const db2 = client2.docstore(config.dbname, options)

        db2.events.on('write', (dbname, hash, entry, heads) => {
          assert.deepEqual(db1.get('hello world'), [])
          db1.sync(heads)
        })

        db1.events.on('synced', () => {
          const value = db1.get(doc1._id)
          assert.deepEqual(value, [doc1])
          done()
        })

        db2.put(doc1)
          .catch(done)
      })
    })
  })
})
