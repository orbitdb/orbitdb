'use strict'

const assert = require('assert')
const mapSeries = require('p-map-series')
const rmrf = require('rimraf')
const path = require('path')
const OrbitDB = require('../src/OrbitDB')
const Cache = require('orbit-db-cache')

const localdown = require('localstorage-down')
const Storage = require('orbit-db-storage-adapter')

// Include test utilities
const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs
} = require('orbit-db-test-utils')

const dbPath = './orbitdb/tests/persistency'
const ipfsPath = './orbitdb/tests/persistency/ipfs'

const tests = [
  {
    title: 'Persistency',
    orbitDBConfig: { directory: path.join(dbPath, '1') }
  },
  {
    title: 'Persistency with custom cache',
    type: "custom",
    orbitDBConfig: { directory: path.join(dbPath, '1') }
  }
]

Object.keys(testAPIs).forEach(API => {
  tests.forEach(test => {
    describe(`orbit-db - ${test.title} (${API})`, function() {
      this.timeout(config.timeout)

      const entryCount = 65

      let ipfsd, ipfs, orbitdb1, db, address

      before(async () => {
        const options = Object.assign({}, test.orbitDBConfig)

        if(test.type === "custom") {
          const customStorage = Storage(localdown)
          const customStore = await customStorage.createStore(dbPath)
          options.cache = new Cache(customStore)
        }

        config.daemon1.repo = ipfsPath
        rmrf.sync(config.daemon1.repo)
        rmrf.sync(dbPath)
        ipfsd = await startIpfs(API, config.daemon1)
        ipfs = ipfsd.api
        orbitdb1 = await OrbitDB.createInstance(ipfs, options)
      })

      after(async () => {
        if(orbitdb1)
          await orbitdb1.stop()

        if (ipfsd)
          await stopIpfs(ipfsd)
      })

      describe('load', function() {
        beforeEach(async () => {
          const dbName = new Date().getTime().toString()
          const entryArr = []

          for (let i = 0; i < entryCount; i ++)
            entryArr.push(i)

          db = await orbitdb1.eventlog(dbName)
          address = db.address.toString()
          await mapSeries(entryArr, (i) => db.add('hello' + i))
          await db.close()
          db = null
        })

        afterEach(async () => {
          await db.drop()
        })

        it('loads database from local cache', async () => {
          db = await orbitdb1.eventlog(address)
          await db.load()
          const items = db.iterator({ limit: -1 }).collect()
          assert.equal(items.length, entryCount)
          assert.equal(items[0].payload.value, 'hello0')
          assert.equal(items[items.length - 1].payload.value, 'hello' + (entryCount - 1))
        })

        it('loads database partially', async () => {
          const amount = 33
          db = await orbitdb1.eventlog(address)
          await db.load(amount)
          const items = db.iterator({ limit: -1 }).collect()
          assert.equal(items.length, amount)
          assert.equal(items[0].payload.value, 'hello' + (entryCount - amount))
          assert.equal(items[1].payload.value, 'hello' + (entryCount - amount + 1))
          assert.equal(items[items.length - 1].payload.value, 'hello' + (entryCount - 1))
        })

        it('load and close several times', async () => {
          const amount = 8
          for (let i = 0; i < amount; i ++) {
            db = await orbitdb1.eventlog(address)
            await db.load()
            const items = db.iterator({ limit: -1 }).collect()
            assert.equal(items.length, entryCount)
            assert.equal(items[0].payload.value, 'hello0')
            assert.equal(items[1].payload.value, 'hello1')
            assert.equal(items[items.length - 1].payload.value, 'hello' + (entryCount - 1))
            await db.close()
          }
        })

        it('closes database while loading', async () => {
          db = await orbitdb1.eventlog(address)
          await new Promise(async (resolve, reject) => {
            // don't wait for load to finish
            db.load().catch(e => {
              if (e.toString() !== 'ReadError: Database is not open') {
                reject(e)
              } else {
                assert.equal(db._cache.store, null)
                resolve()
              }
            })
            await db.close()
          })
        })

        it('load, add one, close - several times', async () => {
          const amount = 8
          for (let i = 0; i < amount; i ++) {
            db = await orbitdb1.eventlog(address)
            await db.load()
            await db.add('hello' + (entryCount + i))
            const items = db.iterator({ limit: -1 }).collect()
            assert.equal(items.length, entryCount + i + 1)
            assert.equal(items[items.length - 1].payload.value, 'hello' + (entryCount + i))
            await db.close()
          }
        })

        it('loading a database emits \'ready\' event', async () => {
          db = await orbitdb1.eventlog(address)
          return new Promise(async (resolve) => {
            db.events.on('ready', () => {
              const items = db.iterator({ limit: -1 }).collect()
              assert.equal(items.length, entryCount)
              assert.equal(items[0].payload.value, 'hello0')
              assert.equal(items[items.length - 1].payload.value, 'hello' + (entryCount - 1))
              resolve()
            })
            await db.load()
          })
        })

        it('loading a database emits \'load.progress\' event', async () => {
          db = await orbitdb1.eventlog(address)
          return new Promise(async (resolve, reject) => {
            let count = 0
            db.events.on('load.progress', (address, hash, entry) => {
              count ++
              try {
                assert.equal(address, db.address.toString())

                const { progress, max } = db.replicationStatus
                assert.equal(max, entryCount)
                assert.equal(progress, count)

                assert.notEqual(hash, null)
                assert.notEqual(entry, null)

                if (progress === entryCount && count === entryCount) {
                  setTimeout(() => {
                    resolve()
                  }, 200)
                }
              } catch (e) {
                reject(e)
              }
            })
            // Start loading the database
            await db.load()
          })
        })
      })

      describe('load from empty snapshot', function() {
        it('loads database from an empty snapshot', async () => {
          db = await orbitdb1.eventlog('empty-snapshot')
          address = db.address.toString()
          await db.saveSnapshot()
          await db.close()

          db = await orbitdb1.open(address)
          await db.loadFromSnapshot()
          const items = db.iterator({ limit: -1 }).collect()
          assert.equal(items.length, 0)
        })
      })

      describe('load from snapshot', function() {
        beforeEach(async () => {
          const dbName = new Date().getTime().toString()
          const entryArr = []

          for (let i = 0; i < entryCount; i ++)
            entryArr.push(i)

          db = await orbitdb1.eventlog(dbName)
          address = db.address.toString()
          await mapSeries(entryArr, (i) => db.add('hello' + i))
          await db.saveSnapshot()
          await db.close()
          db = null
        })

        afterEach(async () => {
          await db.drop()
        })

        it('loads database from snapshot', async () => {
          db = await orbitdb1.eventlog(address)
          await db.loadFromSnapshot()
          const items = db.iterator({ limit: -1 }).collect()
          assert.equal(items.length, entryCount)
          assert.equal(items[0].payload.value, 'hello0')
          assert.equal(items[entryCount - 1].payload.value, 'hello' + (entryCount - 1))
        })

        it('load, add one and save snapshot several times', async () => {
          const amount = 4
          for (let i = 0; i < amount; i ++) {
            db = await orbitdb1.eventlog(address)
            await db.loadFromSnapshot()
            await db.add('hello' + (entryCount + i))
            const items = db.iterator({ limit: -1 }).collect()
            assert.equal(items.length, entryCount + i + 1)
            assert.equal(items[0].payload.value, 'hello0')
            assert.equal(items[items.length - 1].payload.value, 'hello' + (entryCount + i))
            await db.saveSnapshot()
            await db.close()
          }
        })

        it('throws an error when trying to load a missing snapshot', async () => {
          db = await orbitdb1.eventlog(address)
          await db.drop()
          db = null
          db = await orbitdb1.eventlog(address)

          let err
          try {
            await db.loadFromSnapshot()
          } catch (e) {
            err = e.toString()
          }
          assert.equal(err, `Error: Snapshot for ${address} not found!`)
        })

        it('loading a database emits \'ready\' event', async () => {
          db = await orbitdb1.eventlog(address)
          return new Promise(async (resolve) => {
            db.events.on('ready', () => {
              const items = db.iterator({ limit: -1 }).collect()
              assert.equal(items.length, entryCount)
              assert.equal(items[0].payload.value, 'hello0')
              assert.equal(items[entryCount - 1].payload.value, 'hello' + (entryCount - 1))
              resolve()
            })
            await db.loadFromSnapshot()
          })
        })

        it('loading a database emits \'load.progress\' event', async () => {
          db = await orbitdb1.eventlog(address)
          return new Promise(async (resolve, reject) => {
            let count = 0
            db.events.on('load.progress', (address, hash, entry) => {
              count ++
              try {
                assert.equal(address, db.address.toString())

                const { progress, max } = db.replicationStatus
                assert.equal(max, entryCount)
                assert.equal(progress, count)

                assert.notEqual(hash, null)
                assert.notEqual(entry, null)
                if (progress === entryCount && count === entryCount) {
                  resolve()
                }
              } catch (e) {
                reject(e)
              }
            })
            // Start loading the database
            await db.loadFromSnapshot()
          })
        })
      })
    })
  })
})
