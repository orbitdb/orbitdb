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
  testAPIs
} = require('orbit-db-test-utils')

const {
  databases
} = require('./utils')

const dbPath = './orbitdb/tests/write-permissions'
const ipfsPath = './orbitdb/tests/write-permissions/ipfs'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Write Permissions (${API})`, function() {
    this.timeout(20000)

    let ipfsd, ipfs, orbitdb1, orbitdb2

    before(async () => {
      config.daemon1.repo = ipfsPath
      rmrf.sync(config.daemon1.repo)
      rmrf.sync(dbPath)
      ipfsd = await startIpfs(API, config.daemon1)
      ipfs = ipfsd.api
      orbitdb1 = await OrbitDB.createInstance(ipfs, { directory: path.join(dbPath, '1') })
      orbitdb2 = await OrbitDB.createInstance(ipfs, { directory: path.join(dbPath, '2') })
    })

    after(async () => {
      if(orbitdb1)
        await orbitdb1.stop()

      if(orbitdb2)
        await orbitdb2.stop()

      if (ipfsd)
        await stopIpfs(ipfsd)
    })

    describe('allows multiple peers to write to the databases', function() {
      databases.forEach(async (database) => {
        it(database.type + ' allows multiple writers', async () => {
          let options = {
            // Set write access for both clients
            accessController: {
              write: [
                orbitdb1.identity.id,
                orbitdb2.identity.id
              ]
            }
          }

          const db1 = await database.create(orbitdb1, 'sync-test', options)
          options = Object.assign({}, options, { sync: true })
          const db2 = await database.create(orbitdb2, db1.address.toString(), options)

          await database.tryInsert(db1)
          await database.tryInsert(db2)

          assert.deepEqual(database.getTestValue(db1), database.expectedValue)
          assert.deepEqual(database.getTestValue(db2), database.expectedValue)

          await db1.close()
          await db2.close()
        })
      })
    })

    describe('syncs databases', function() {
      databases.forEach(async (database) => {
        it(database.type + ' syncs', async () => {
          let options = {
            // Set write access for both clients
            accessController: {
              write: [
                orbitdb1.identity.id,
                orbitdb2.identity.id
              ]
            }
          }

          const db1 = await database.create(orbitdb1, 'sync-test', options)
          options = Object.assign({}, options, { sync: true })
          const db2 = await database.create(orbitdb2, db1.address.toString(), options)

          await database.tryInsert(db2)

          assert.strictEqual(database.query(db1).length, 0)
          db1.sync(db2._oplog.heads)

          return new Promise(resolve => {
            setTimeout(async () => {
              const value = database.getTestValue(db1)
              assert.deepEqual(value, database.expectedValue)
              await db1.close()
              await db2.close()
              resolve()
            }, 300)
          })
        })
      })
    })

    describe('syncs databases that anyone can write to', function() {
      databases.forEach(async (database) => {
        it(database.type + ' syncs', async () => {
          let options = {
            // Set write permission for everyone
            accessController: {
              write: ['*']
            }
          }

          const db1 = await database.create(orbitdb1, 'sync-test-public-dbs', options)
          options = Object.assign({}, options, { sync: true })
          const db2 = await database.create(orbitdb2, db1.address.toString(), options)

          await database.tryInsert(db2)

          assert.strictEqual(database.query(db1).length, 0)
          db1.sync(db2._oplog.heads)

          return new Promise(resolve => {
            setTimeout(async () => {
              const value = database.getTestValue(db1)
              assert.deepEqual(value, database.expectedValue)
              await db1.close()
              await db2.close()
              resolve()
            }, 300)
          })
        })
      })
    })

    describe('doesn\'t sync if peer is not allowed to write to the database', function() {
      databases.forEach(async (database) => {
        it(database.type + ' doesn\'t sync', async () => {

          let options = {
            // Only peer 1 can write
            accessController: {
              write: [orbitdb1.identity.id]
            }
          }
          let err
          options = Object.assign({}, options, { path: path.join(dbPath, '/sync-test/1') })
          const db1 = await database.create(orbitdb1, 'write error test 1', options)
          options = Object.assign({}, options, { path: path.join(dbPath, '/sync-test/2'), sync: true })
          const db2 = await database.create(orbitdb2, 'write error test 1', options)

          try {
            // Catch replication event if the update from peer 2 got synced and into the database
            db1.events.on('replicated', () => err = new Error('Shouldn\'t replicate!'))
            // Try to update from peer 2, this shouldn't be allowed
            await database.tryInsert(db2)
          } catch (e) {
            // Make sure peer 2's instance throws an error
            err = e.toString()
          }
          assert.strictEqual(err, `Error: Could not append entry, key "${orbitdb2.identity.id}" is not allowed to write to the log`)

          // Make sure nothing was added to the database
          assert.strictEqual(database.query(db1).length, 0)

          // Try to sync peer 1 with peer 2, this shouldn't produce anything
          // at peer 1 (nothing was supposed to be added to the database by peer 2)
          db1.sync(db2._oplog.heads)

          return new Promise((resolve, reject) => {
            setTimeout(async () => {
              // Make sure nothing was added
              assert.strictEqual(database.query(db1).length, 0)
              await db1.close()
              await db2.close()
              if (!err) {
                reject(new Error('tryInsert should throw an err'))
              } else {
                resolve()
              }
            }, 300)
          })
        })
      })
    })

    describe('throws an error if peer is not allowed to write to the database', function() {
      databases.forEach(async (database) => {
        it(database.type + ' throws an error', async () => {
          let options = {
            // No write access (only creator of the database can write)
            accessController: {
              write: []
            }
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
          assert.strictEqual(err, `Error: Could not append entry, key "${orbitdb2.identity.id}" is not allowed to write to the log`)
        })
      })
    })
  })
})
