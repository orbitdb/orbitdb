'use strict'

const assert = require('assert')
const rmrf = require('rimraf')
const OrbitDB = require('../src/OrbitDB')
const config = require('./utils/config')
const startIpfs = require('./utils/start-ipfs')

const dbPath = './orbitdb/tests/sync'
const ipfsPath = './orbitdb/tests/feed/ipfs'

const databases = [
  {
    type: 'eventlog',
    create: (orbitdb, name, options) => orbitdb.eventlog(name, options),
    tryInsert: (db) => db.add('hello'),
    query: (db) => db.iterator({ limit: -1 }).collect(),
    getTestValue: (db) => db.iterator({ limit: -1 }).collect()[0].payload.value,
    expectedValue: 'hello',
  },
  {
    type: 'feed',
    create: (orbitdb, name, options) => orbitdb.feed(name, options),
    tryInsert: (db) => db.add('hello'),
    query: (db) => db.iterator({ limit: -1 }).collect(),
    getTestValue: (db) => db.iterator({ limit: -1 }).collect()[0].payload.value,
    expectedValue: 'hello',
  },
  {
    type: 'key-value',
    create: (orbitdb, name, options) => orbitdb.kvstore(name, options),
    tryInsert: (db) => db.set('one', 'hello'),
    query: (db) => [],
    getTestValue: (db) => db.get('one'),
    expectedValue: 'hello',
  },
  {
    type: 'documents',
    create: (orbitdb, name, options) => orbitdb.docstore(name, options),
    tryInsert: (db) => db.put({ _id: 'hello world', doc: 'all the things'}),
    query: (db) => [],
    getTestValue: (db) => db.get('hello world'),
    expectedValue: [{ _id: 'hello world', doc: 'all the things'}],
  },
  {
    type: 'counter',
    create: (orbitdb, name, options) => orbitdb.counter(name, options),
    tryInsert: (db) => db.inc(8),
    query: (db) => [],
    getTestValue: (db) => db.value,
    expectedValue: 8,
  },
]

describe('orbit-db - Write Permissions', function() {
  this.timeout(10000)

  let ipfs, orbitdb1, orbitdb2

  before(async () => {
    config.daemon1.repo = ipfsPath
    rmrf.sync(config.daemon1.repo)
    rmrf.sync(dbPath)
    ipfs = await startIpfs(config.daemon1)
    orbitdb1 = new OrbitDB(ipfs, dbPath + '/1')
    orbitdb2 = new OrbitDB(ipfs, dbPath + '/2')
  })

  after(async () => {
    if(orbitdb1) 
      orbitdb1.stop()

    if(orbitdb2) 
      orbitdb2.stop()

    if (ipfs)
      await ipfs.stop()
  })

  describe('allows multiple peers to write to the databases', function() {
    databases.forEach(async (database) => {
      it(database.type + ' allows multiple writers', async () => {
        let options = { 
          // Set write access for both clients
          write: [
            orbitdb1.key.getPublic('hex'), 
            orbitdb2.key.getPublic('hex')
          ],
        }

        const db1 = await database.create(orbitdb1, 'sync-test', options)
        options = Object.assign({}, options, { sync: true })
        const db2 = await database.create(orbitdb2, db1.address.toString(), options)

        await database.tryInsert(db1)
        await database.tryInsert(db2)

        assert.deepEqual(database.getTestValue(db1), database.expectedValue)
        assert.deepEqual(database.getTestValue(db2), database.expectedValue)
      })
    })
  })

  describe('syncs databases', function() {
    databases.forEach(async (database) => {
      it(database.type + ' syncs', async () => {
        let options = { 
          // Set write access for both clients
          write: [
            orbitdb1.key.getPublic('hex'), 
            orbitdb2.key.getPublic('hex')
          ],
        }

        const db1 = await database.create(orbitdb1, 'sync-test', options)
        options = Object.assign({}, options, { sync: true })
        const db2 = await database.create(orbitdb2, db1.address.toString(), options)

        await database.tryInsert(db2)

        assert.equal(database.query(db1).length, 0)
        db1.sync(db2._oplog.heads)

        return new Promise(resolve => {
          setTimeout(() => {
            const value = database.getTestValue(db1)
            assert.deepEqual(value, database.expectedValue)
            resolve()
          }, 1000)
        })
      })
    })
  })

  describe('syncs databases that anyone can write to', function() {
    databases.forEach(async (database) => {
      it(database.type + ' syncs', async () => {
        let options = { 
          // Set write permission for everyone
          write: ['*'],
        }

        const db1 = await database.create(orbitdb1, 'sync-test-public-dbs', options)
        options = Object.assign({}, options, { sync: true })
        const db2 = await database.create(orbitdb2, db1.address.toString(), options)

        await database.tryInsert(db2)

        assert.equal(database.query(db1).length, 0)
        db1.sync(db2._oplog.heads)

        return new Promise(resolve => {
          setTimeout(() => {
            const value = database.getTestValue(db1)
            assert.deepEqual(value, database.expectedValue)
            resolve()
          }, 1000)
        })
      })
    })
  })

  describe('doesn\'t sync if peer is not allowed to write to the database', function() {
    databases.forEach(async (database) => {
      it(database.type + ' doesn\'t sync', async () => {
        let options = { 
          // No write access (only creator of the database can write)
          write: [],
        }

        options = Object.assign({}, options, { path: dbPath + '/sync-test/1' })
        const db1 = await database.create(orbitdb1, 'write error test 1', options)

        options = Object.assign({}, options, { path: dbPath + '/sync-test/2', sync: true })
        const db2 = await database.create(orbitdb2, 'write error test 1', options)

        db1.events.on('replicated', () => {
          throw new Error('Shouldn\'t replicate!')
        })

        try {
          await database.tryInsert(db2)
        } catch (e) {
          assert.equal(e.toString(), 'Error: Not allowed to write')
        }

        assert.equal(database.query(db1).length, 0)
        db1.sync(db2._oplog.heads)

        return new Promise(resolve => {
          setTimeout(() => {
            assert.equal(database.query(db1).length, 0)
            resolve()
          }, 500)
        })
      })
    })
  })

  describe('throws an error if peer is not allowed to write to the database', function() {
    databases.forEach(async (database) => {
      it(database.type + ' throws an error', async () => {
        let options = { 
          // No write access (only creator of the database can write)
          write: [],
        }

        let err
        try {
          const db1 = await database.create(orbitdb1, 'write error test 2', options)
        options = Object.assign({}, options, { sync: true })
          const db2 = await database.create(orbitdb2, db1.address.toString(), options)
          await database.tryInsert(db2)
        } catch (e) {
          err = e.toString()
        }
        assert.equal(err, 'Error: Not allowed to write')
      })
    })
  })
})
