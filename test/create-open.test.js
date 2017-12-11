'use strict'

const assert = require('assert')
const mapSeries = require('p-map-series')
const fs = require('fs')
const path = require('path')
const rmrf = require('rimraf')
const levelup = require('levelup')
const leveldown = require('leveldown')
const OrbitDB = require('../src/OrbitDB')
const OrbitDBAddress = require('../src/orbit-db-address')

// Include test utilities
const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs,
} = require('./utils')

const dbPath = './orbitdb/tests/create-open'
const ipfsPath = './orbitdb/tests/create-open/ipfs'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Create & Open (${API})`, function() {
    this.timeout(config.timeout)

    let ipfsd, ipfs, orbitdb, db, address
    let localDataPath

    before(async () => {
      config.daemon1.repo = ipfsPath
      rmrf.sync(config.daemon1.repo)
      rmrf.sync(dbPath)
      ipfsd = await startIpfs(API, config.daemon1)
      ipfs = ipfsd.api
      orbitdb = new OrbitDB(ipfs, dbPath)
    })

    after(async () => {
      if(orbitdb) 
        await orbitdb.stop()

      if (ipfsd)
        await stopIpfs(ipfsd)
    })

    describe('Create', function() {
      describe('Errors', function() {
        it('throws an error if given an invalid database type', async () => {
          let err
          try {
            db = await orbitdb.create('first', 'invalid-type')
          } catch (e) {
            err = e.toString()
          }
          assert.equal(err, 'Error: Invalid database type \'invalid-type\'')
        })

        it('throws an error if given an address instead of name', async () => {
          let err
          try {
            db = await orbitdb.create('/orbitdb/Qmc9PMho3LwTXSaUXJ8WjeBZyXesAwUofdkGeadFXsqMzW/first', 'feed')
          } catch (e) {
            err = e.toString()
          }
          assert.equal(err, 'Error: Given database name is an address. Please give only the name of the database!')
        })

        it('throws an error if database already exists', async () => {
          let err
          try {
            db = await orbitdb.create('first', 'feed', { replicate: false })
            db = await orbitdb.create('first', 'feed', { replicate: false })
          } catch (e) {
            err = e.toString()
          }
          assert.equal(err, `Error: Database '${db.address}' already exists!`)
        })


        it('throws an error if database type doesn\'t match', async () => {
          let err, log, kv
          try {
            log = await orbitdb.kvstore('keyvalue', { replicate: false })
            kv = await orbitdb.eventlog(log.address.toString())
          } catch (e) {
            err = e.toString()
          }
          assert.equal(err, `Error: Database '${log.address}' is type 'keyvalue' but was opened as 'eventlog'`)
        })
      })

      describe('Success', function() {
        before(async () => {
          db = await orbitdb.create('second', 'feed', { replicate: false })
          localDataPath = path.join(dbPath, db.address.root, db.address.path)
          await db.close()
        })

        it('creates a feed database', async () => {
          assert.notEqual(db, null)
        })

        it('database has the correct address', async () => {
          assert.equal(db.address.toString().indexOf('/orbitdb'), 0)
          assert.equal(db.address.toString().indexOf('Qm'), 9)
          assert.equal(db.address.toString().indexOf('second'), 56)
        })

        it('saves the database locally', async () => {
          assert.equal(fs.existsSync(localDataPath), true)
        })

        it('saves database manifest reference locally', async () => {
          const manifestHash = db.address.root
          const address = db.address.toString()
          levelup(localDataPath, (err, db) => {
            if (err) {
              assert.equal(err, null)
            }

            db.get(address + '/_manifest', (err, value) => {
              if (err) {
                assert.equal(err, null)
              }

              const data = JSON.parse(value || '{}')
              assert.equal(data, manifestHash)
            })
          })
        })

        it('saves database manifest file locally', async () => {
          const dag = await ipfs.object.get(db.address.root)
          const manifest = JSON.parse(dag.toJSON().data)
          assert.notEqual(manifest, )
          assert.equal(manifest.name, 'second')
          assert.equal(manifest.type, 'feed')
          assert.notEqual(manifest.accessController, null)
          assert.equal(manifest.accessController.indexOf('/ipfs'), 0)
        })

        it('can pass local database directory as an option', async () => {
          const dir = './orbitdb/tests/another-feed'
          db = await orbitdb.create('third', 'feed', { directory: dir })
          localDataPath = path.join(dir, db.address.root, db.address.path)
          assert.equal(fs.existsSync(localDataPath), true)
        })

        describe('Access Controller', function() {
          before(async () => {
            if (db) {
              await db.close()
              await db.drop()
            }
          })

          afterEach(async () => {
            if (db) {
              await db.close()
              await db.drop()
            }
          })

          it('creates an access controller and adds ourselves as writer by default', async () => {
            db = await orbitdb.create('fourth', 'feed')
            assert.deepEqual(db.access.write, [orbitdb.key.getPublic('hex')])
          })

          it('creates an access controller and adds writers', async () => {
            db = await orbitdb.create('fourth', 'feed', { write: ['another-key', 'yet-another-key', orbitdb.key.getPublic('hex')] })
            assert.deepEqual(db.access.write, ['another-key', 'yet-another-key', orbitdb.key.getPublic('hex')])
          })

          it('creates an access controller and doesn\'t add an admin', async () => {
            db = await orbitdb.create('sixth', 'feed')
            assert.deepEqual(db.access.admin, [])
          })

          it('creates an access controller and doesn\'t add read access keys', async () => {
            db = await orbitdb.create('seventh', 'feed', { read: ['one', 'two'] })
            assert.deepEqual(db.access.read, [])
          })
        })
      })
    })

    describe('Open', function() {
      before(async () => {
        db = await orbitdb.open('abc', { create: true, type: 'feed' })
      })

      it('throws an error if trying to open a database with name only and \'create\' is not set to \'true\'', async () => {
        let err
        try {
          db = await orbitdb.open('XXX', { create: false })
        } catch (e) {
          err = e.toString()
        }
        assert.equal(err, "Error: 'options.create' set to 'false'. If you want to create a database, set 'options.create' to 'true'.")
      })

      it('throws an error if trying to open a database with name only and \'create\' is not set to true', async () => {
        let err
        try {
          db = await orbitdb.open('YYY', { create: true })
        } catch (e) {
          err = e.toString()
        }
        assert.equal(err, `Error: Database type not provided! Provide a type with 'options.type' (${OrbitDB.databaseTypes.join('|')})`)
      })

      it('opens a database - name only', async () => {
        db = await orbitdb.open('abc', { create: true, type: 'feed', overwrite: true })
        assert.equal(db.address.toString().indexOf('/orbitdb'), 0)
        assert.equal(db.address.toString().indexOf('Qm'), 9)
        assert.equal(db.address.toString().indexOf('abc'), 56)
      })

      it('opens the same database - from an address', async () => {
        db = await orbitdb.open(db.address)
        assert.equal(db.address.toString().indexOf('/orbitdb'), 0)
        assert.equal(db.address.toString().indexOf('Qm'), 9)
        assert.equal(db.address.toString().indexOf('abc'), 56)
      })

      it('opens a database and adds the creator as the only writer', async () => {
        db = await orbitdb.open('abc', { create: true, type: 'feed', overwrite: true, write: [] })
        assert.equal(db.access.write.length, 1)
        assert.equal(db.access.write[0], db.key.getPublic('hex'))
      })

      it('doesn\'t open a database if we don\'t have it locally', async () => {
        const address = new OrbitDBAddress(db.address.root.slice(0, -1) + 'A', 'non-existent')
        return new Promise((resolve, reject) => {
          setTimeout(resolve, 900)
          orbitdb.open(address)
            .then(() => reject(new Error('Shouldn\'t open the database')))
        })
      })

      it('throws an error if trying to open a database locally and we don\'t have it', () => {
        const address = new OrbitDBAddress(db.address.root.slice(0, -1) + 'A', 'second')
        return orbitdb.open(address, { localOnly: true })
          .then(() => new Error('Shouldn\'t open the database'))
          .catch(e => {
            assert.equal(e.toString(), `Error: Database '${address}' doesn't exist!`)
          })
      })

      it('open the database and it has the added entries', async () => {
        db = await orbitdb.open('ZZZ', { create: true, type: 'feed' })
        await db.add('hello1')
        await db.add('hello2')

        db = await orbitdb.open(db.address)
        await db.load()
        const res = db.iterator({ limit: -1 }).collect()

        assert.equal(res.length, 2)
        assert.equal(res[0].payload.value, 'hello1')
        assert.equal(res[1].payload.value, 'hello2')
      })
    })
  })

})
