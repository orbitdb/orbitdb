'use strict'

const assert = require('assert')
const rmrf = require('rimraf')
const OrbitDB = require('../src/OrbitDB')
const ContractAPI = require('../src/contract-api')
const IdentityProvider = require('orbit-db-identity-provider')
const { open } = require('@colony/purser-software')
const Web3 = require('web3')
const fs = require('fs')
const path =require('path')
const keystore = require('orbit-db-keystore').create(path.join('./','/keystore'))
const abi = JSON.parse(fs.readFileSync(path.resolve('./test/', 'abi.json')))

// Include test utilities
const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs,
} = require('./utils')

const dbPath = './orbitdb/tests/dynamic-ac'
const ipfsPath = './orbitdb/tests/dynamic-ac/ipfs'

const databases = [
  {
    type: 'key-value',
    create: (orbitdb, name, options) => orbitdb.kvstore(name, options),
    tryInsert: (db) => db.set('one', 'hello'),
    query: (db) => [],
    getTestValue: (db) => db.get('one'),
    expectedValue: 'hello',
  }
]

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Write Permissions (${API})`, function() {
    this.timeout(20000)

    let ipfsd, ipfs, orbitdb1, orbitdb2, id1, id2, contractAPI

    before(async () => {
      config.daemon1.repo = ipfsPath
      rmrf.sync(config.daemon1.repo)
      rmrf.sync(dbPath)
      ipfsd = await startIpfs(API, config.daemon1)
      ipfs = ipfsd.api

      const address = '0xF9d040A318c468a8AAeB5B61d73bB20b799d847D'
      const primaryAccount ='0xA3F0f20f8A2872a6A74AD802EEB9F3F6d1B966A8'

      let wallet1 = await open({
        privateKey: '0x3141592653589793238462643383279502884197169399375105820974944592'
      })

      let wallet2 = await open({
        privateKey: '0x2141592653589793238462643383279502884197169399375105820974944592'
      })

      const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://127.0.0.1:8546'))
      contractAPI = new ContractAPI(web3, abi, address, primaryAccount)

      const signer1 = async (id, data) => { return await wallet1.signMessage({ message: data }) }
      const signer2 = async (id, data) => { return await wallet2.signMessage({ message: data }) }

      id1 = await IdentityProvider.createIdentity(keystore, wallet1.address, { type: 'ethers', identitySignerFn: signer1 })
      id2 = await IdentityProvider.createIdentity(keystore, wallet2.address, { type: 'ethers', identitySignerFn: signer2 })

      orbitdb1 = await OrbitDB.createInstance(ipfs, {
        acType: 'contract',
        contractAPI: contractAPI,
        directory: dbPath + '/1',
        identity: id1
      })
      orbitdb2 = await OrbitDB.createInstance(ipfs, {
        acType: 'contract',
        contractAPI: contractAPI,
        directory: dbPath + '/2',
        identity: id2
      })
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
            acType: 'contract',
            contractAPI: contractAPI,
            // Set write access for both clients
            write: [
              orbitdb1.identity.id
            ],
          }

          const db1 = await database.create(orbitdb1, 'sync-test', options)
          options = Object.assign({}, options, { sync: true })
          const db2 = await database.create(orbitdb2, db1.address.toString(), options)

          // TODO remove
          await db2.access.remove('write', orbitdb2.identity.id)

          let err
          await database.tryInsert(db1)
          try {
            await database.tryInsert(db2)
          } catch (e) {
            err = e.toString()
          }

          assert.deepEqual(database.getTestValue(db1), database.expectedValue)
          assert.equal(err, `Error: Could not append entry, key "${orbitdb2.identity.id}" is not allowed to write to the log`)

          await db2.access.add('write', orbitdb2.identity.id)
          await database.tryInsert(db2)
          assert.deepEqual(database.getTestValue(db2), database.expectedValue)

          await db1.close()
          await db2.close()
        })
      })
    })

  })

})
