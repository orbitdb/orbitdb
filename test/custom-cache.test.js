// import assert from 'assert'
// import rmrf from 'rimraf'
// import path from 'path'
// import OrbitDB from '../src/OrbitDB.js'
// import CustomCache from 'orbit-db-cache'
// import localdown from 'localstorage-down'
// import storageAdapter from 'orbit-db-storage-adapter'

// // Include test utilities
// import {
//   config,
//   startIpfs,
//   stopIpfs,
//   testAPIs,
// } from 'orbit-db-test-utils'

// import { databases } from './utils/index.js'

// const storage = storageAdapter(localdown)

// const dbPath = './orbitdb/tests/customKeystore'

// Object.keys(testAPIs).forEach(API => {
//   describe(`orbit-db - Use a Custom Cache (${API})`, function() {
//     this.timeout(20000)

//     let ipfsd, ipfs, orbitdb1, store

//     before(async () => {
//       store = await storage.createStore("orbitdb/test/local")
//       const cache = new CustomCache(store)

//       rmrf.sync(dbPath)
//       ipfsd = await startIpfs(API, config.daemon1)
//       ipfs = ipfsd.api
//       orbitdb1 = await OrbitDB.createInstance(ipfs, {
//         directory: path.join(dbPath, '1'),
//         cache: cache
//       })
//     })

//     after(async () => {
//       await orbitdb1.stop()
//       await stopIpfs(ipfsd)
//     })

//     describe('allows orbit to use a custom cache with different store types', function() {
//       for (let database of databases) {
//         it(database.type + ' allows custom cache', async () => {
//           const db1 = await database.create(orbitdb1, 'custom-keystore')
//           await database.tryInsert(db1)

//           assert.deepEqual(database.getTestValue(db1), database.expectedValue)
//           await db1.close()
//         })
//       }
//     })
//   })
// })
