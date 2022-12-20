import assert from 'assert'
import rmrf from 'rimraf'
import path from 'path'
import OrbitDB from '../src/OrbitDB.js'
import Identities from 'orbit-db-identity-provider'
// Include test utilities
import {
  config,
  startIpfs,
  stopIpfs,
  testAPIs,
} from 'orbit-db-test-utils'

import {
  CustomTestKeystore,
  databases,
} from './utils/index.js'

Identities.addIdentityProvider(CustomTestKeystore().identityProvider)

const dbPath = './orbitdb/tests/customKeystore'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Use a Custom Keystore (${API})`, function() {
    this.timeout(20000)

    let ipfsd, ipfs, orbitdb1

    before(async () => {
      rmrf.sync(dbPath)
      ipfsd = await startIpfs(API, config.daemon1)
      ipfs = ipfsd.api
      const identity = await Identities.createIdentity({ type: 'custom', keystore: CustomTestKeystore().create()  })
      orbitdb1 = await OrbitDB.createInstance(ipfs, {
        directory: path.join(dbPath, '1'),
        identity
      })
    })

    after(async () => {
      await orbitdb1.stop()
      await stopIpfs(ipfsd)
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
