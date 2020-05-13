'use strict'

const assert = require('assert')
const rmrf = require('rimraf')
const path = require('path')
const OrbitDB = require('../src/OrbitDB')
const Identities = require('orbit-db-identity-provider')
// Include test utilities
const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs,
} = require('orbit-db-test-utils')

const {
  CustomTestKeystore,
  databases,
} = require('./utils')

Identities.addIdentityProvider(CustomTestKeystore().identityProvider)

const dbPath = './orbitdb/tests/customKeystore'
const ipfsPath = './orbitdb/tests/customKeystore/ipfs'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Use a Custom Keystore (${API})`, function() {
    this.timeout(20000)

    let ipfsd, ipfs, orbitdb1

    before(async () => {
      config.daemon1.repo = ipfsPath
      rmrf.sync(config.daemon1.repo)
      rmrf.sync(dbPath)
      ipfsd = await startIpfs(API, config.daemon1)
      ipfs = ipfsd.api
      const identity = await Identities.createIdentity({ type: 'custom', keystore: CustomTestKeystore().create()  })
      orbitdb1 = await OrbitDB.createInstance(ipfs, {
        directory: path.join(dbPath, '1'),
        identity
      })
    })

    after(() => {
      setTimeout(async () => {
        await orbitdb1.stop()
        await stopIpfs(ipfsd)
      }, 0)
    })

    describe('allows orbit to use a custom keystore with different store types', function() {
      databases.forEach(async (database) => {
        it(database.type + ' allows custom keystore', async () => {
          const db1 = await database.create(orbitdb1, 'custom-keystore')
          await database.tryInsert(db1)

          assert.deepEqual(database.getTestValue(db1), database.expectedValue)

          await db1.close()
        })
      })
    })

    describe('allows a custom keystore to be used with different store and write permissions', function() {
      databases.forEach(async (database) => {
        it(database.type + ' allows custom keystore', async () => {
          const options = {
            accessController: {
              // Set write access for both clients
              write: [orbitdb1.identity.id]
            }
          }

          const db1 = await database.create(orbitdb1, 'custom-keystore', options)
          await database.tryInsert(db1)

          assert.deepEqual(database.getTestValue(db1), database.expectedValue)

          await db1.close()
        })
      })
    })
  })
})
