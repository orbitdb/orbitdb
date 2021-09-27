'use strict'

const assert = require('assert')
const rmrf = require('rimraf')
const Web3 = require('web3')
const OrbitDB = require('../../src/OrbitDB.js')
const IdentityProvider = require('orbit-db-identity-provider')
const Keystore = require('orbit-db-keystore')
const AccessControllers = require('orbit-db-access-controllers')
const ContractAccessController = require('orbit-db-access-controllers/src/contract-access-controller.js')
const ganache = require('ganache-cli')
const { abi, bytecode } = require('./Access')

// Include test utilities
const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs
} = require('orbit-db-test-utils')

const dbPath1 = './orbitdb/tests/orbitdb-access-controller/1'
const dbPath2 = './orbitdb/tests/orbitdb-access-controller/2'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Access Controller Handlers (${API})`, function () {
    this.timeout(config.timeout)

    let web3, contract, ipfsd1, ipfsd2, ipfs1, ipfs2, id1, id2
    let orbitdb1, orbitdb2

    before(async () => {
      rmrf.sync(dbPath1)
      rmrf.sync(dbPath2)
      ipfsd1 = await startIpfs(API, config.daemon1)
      ipfsd2 = await startIpfs(API, config.daemon2)
      ipfs1 = ipfsd1.api
      ipfs2 = ipfsd2.api

      const keystore1 = new Keystore(dbPath1 + '/keys')
      const keystore2 = new Keystore(dbPath2 + '/keys')

      id1 = await IdentityProvider.createIdentity({ id: 'A', keystore: keystore1 })
      id2 = await IdentityProvider.createIdentity({ id: 'B', keystore: keystore2 })

      orbitdb1 = await OrbitDB.createInstance(ipfs1, {
        AccessControllers: AccessControllers,
        directory: dbPath1,
        identity: id1
      })

      orbitdb2 = await OrbitDB.createInstance(ipfs2, {
        AccessControllers: AccessControllers,
        directory: dbPath2,
        identity: id2
      })
    })

    after(async () => {
      if (orbitdb1) { await orbitdb1.stop() }

      if (orbitdb2) { await orbitdb2.stop() }

      if (ipfsd1) { await stopIpfs(ipfsd1) }

      if (ipfsd2) { await stopIpfs(ipfsd2) }
    })

    describe('isSupported', function () {
      it('supports default access controllers', () => {
        assert.strictEqual(AccessControllers.isSupported('ipfs'), true)
        assert.strictEqual(AccessControllers.isSupported('orbitdb'), true)
      })

      it('doesn\'t support smart contract access controller by default', () => {
        assert.strictEqual(AccessControllers.isSupported(ContractAccessController.type), false)
      })
    })

    describe('addAccessController', function () {
      it('supports added access controller', () => {
        const options = {
          AccessController: ContractAccessController,
          web3: web3,
          abi: abi
        }
        AccessControllers.addAccessController(options)
        assert.strictEqual(AccessControllers.isSupported(ContractAccessController.type), true)
      })
    })

    describe('create access controllers', function () {
      let options = {
        AccessController: ContractAccessController
      }

      before(async () => {
        web3 = new Web3(ganache.provider())
        const accounts = await web3.eth.getAccounts()
        contract = await new web3.eth.Contract(abi)
          .deploy({ data: bytecode })
          .send({ from: accounts[0], gas: '1000000' })
        options = Object.assign({}, options, { web3, abi, contractAddress: contract._address, defaultAccount: accounts[0] })
        AccessControllers.addAccessController(options)
      })

      it('throws an error if AccessController is not defined', async () => {
        let err
        try {
          AccessControllers.addAccessController({})
        } catch (e) {
          err = e.toString()
        }
        assert.strictEqual(err, 'Error: AccessController class needs to be given as an option')
      })

      it('throws an error if AccessController doesn\'t define type', async () => {
        let err
        try {
          AccessControllers.addAccessController({ AccessController: {} })
        } catch (e) {
          err = e.toString()
        }
        assert.strictEqual(err, 'Error: Given AccessController class needs to implement: static get type() { /* return a string */}.')
      })

      it('creates a custom access controller', async () => {
        const type = ContractAccessController.type
        const acManifestHash = await AccessControllers.create(orbitdb1, type, options)
        assert.notStrictEqual(acManifestHash, null)

        const ac = await AccessControllers.resolve(orbitdb1, acManifestHash, options)
        assert.strictEqual(ac.type, type)
      })

      it('removes the custom access controller', async () => {
        AccessControllers.removeAccessController(ContractAccessController.type)
        assert.strictEqual(AccessControllers.isSupported(ContractAccessController.type), false)
      })
    })
  })
})
