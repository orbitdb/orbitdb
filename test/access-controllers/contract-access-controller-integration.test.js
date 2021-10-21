'use strict'

const assert = require('assert')
const rmrf = require('rimraf')
const OrbitDB = require('../../src/OrbitDB.js')
const IdentityProvider = require('orbit-db-identity-provider')
const EthIdentityProvider = require('orbit-db-identity-provider/src/ethereum-identity-provider')
const Keystore = require('orbit-db-keystore')
const AccessControllers = require('orbit-db-access-controllers')
const ContractAccessController = require('orbit-db-access-controllers/src/contract-access-controller')
const DepositContractAccessController = require('orbit-db-access-controllers/src/deposit-contract-access-controller')
const ganache = require('ganache-cli')
const Web3 = require('web3')
const io = require('orbit-db-io')
// Include test utilities
const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs,
  connectPeers
} = require('orbit-db-test-utils')

const dbPath1 = './orbitdb/tests/contract-access-controller-integration/1'
const dbPath2 = './orbitdb/tests/contract-access-controller-integration/2'

const accessControllers = [
  {
    AccessController: ContractAccessController,
    contract: require('./Access')
  },
  {
    AccessController: DepositContractAccessController,
    contract: require('./PayDeposit')
  }
]

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - ContractAccessController Integration (${API})`, function () {
    this.timeout(config.timeout * 2)

    let ipfsd1, ipfsd2, ipfs1, ipfs2, id1, id2
    let orbitdb1, orbitdb2
    let web3, accounts

    before(async () => {
      rmrf.sync(dbPath1)
      rmrf.sync(dbPath2)
      ipfsd1 = await startIpfs(API, config.daemon1)
      ipfsd2 = await startIpfs(API, config.daemon2)
      ipfs1 = ipfsd1.api
      ipfs2 = ipfsd2.api

      // Connect the peers manually to speed up test times
      const isLocalhostAddress = (addr) => addr.toString().includes('127.0.0.1')
      await connectPeers(ipfs1, ipfs2, { filter: isLocalhostAddress })

      const keystore1 = new Keystore(dbPath1 + '/keys')
      const keystore2 = new Keystore(dbPath2 + '/keys')
      IdentityProvider.addIdentityProvider(EthIdentityProvider)

      id1 = await IdentityProvider.createIdentity({ type: 'ethereum', keystore: keystore1 })
      id2 = await IdentityProvider.createIdentity({ type: 'ethereum', keystore: keystore2 })

      web3 = new Web3(ganache.provider())
      accounts = await web3.eth.getAccounts()

      accessControllers.forEach(ac => AccessControllers.addAccessController(ac))

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
      if (orbitdb1) {
        await orbitdb1.stop()
      }

      if (orbitdb2) {
        await orbitdb2.stop()
      }

      if (ipfsd1) {
        await stopIpfs(ipfsd1)
      }

      if (ipfsd2) {
        await stopIpfs(ipfsd2)
      }
    })

    describe('OrbitDB Integration', function () {
      accessControllers.forEach(async (ac, i) => {
        let db, db2
        let dbManifest, acManifest, access
        let contract

        before(async () => {
          contract = await new web3.eth.Contract(ac.contract.abi)
            .deploy({ data: ac.contract.bytecode })
            .send({ from: accounts[i], gas: '1000000' })

          // DB creator needs to provide ac-type, abi and contract-address
          db = await orbitdb1.feed('AABB', {
            identity: id1,
            accessController: {
              type: ac.AccessController.type,
              web3: web3,
              abi: ac.contract.abi,
              contractAddress: contract._address,
              defaultAccount: accounts[i]
            }
          })

          // DB peer needs to provide web3 instance
          db2 = await orbitdb2.feed(db.address, {
            identity: id2,
            accessController: {
              web3: web3,
              defaultAccount: accounts[(i + 1) % accessControllers.length] // peer owns different eth-account
            }
          })

          await db2.load()

          dbManifest = await io.read(ipfs1, db.address.root)
          const hash = dbManifest.accessController.split('/').pop()
          acManifest = await io.read(ipfs1, hash)
          access = await io.read(ipfs1, acManifest.params.address)
        })

        it('makes database use the correct access controller', async () => {
          assert.strictEqual(access.contractAddress, db.access.address)
        })

        it('saves database manifest file locally', async () => {
          assert.notStrictEqual(dbManifest, null)
        })

        it('saves access controller manifest file locally', async () => {
          assert.notStrictEqual(acManifest, null)
        })

        describe('database manifest', () => {
          it('has correct name', async () => {
            assert.strictEqual(dbManifest.name, 'AABB')
          })

          it('has correct type', async () => {
            assert.strictEqual(dbManifest.type, 'feed')
          })

          it('has correct address', async () => {
            assert.notStrictEqual(dbManifest.accessController, null)
            assert.strictEqual(dbManifest.accessController.indexOf('/ipfs'), 0)
          })
        })

        describe('access controller manifest', () => {
          it('has correct type', async () => {
            assert.strictEqual(acManifest.type, ac.AccessController.type)
          })

          it('has correct address', async () => {
            assert.strictEqual(access.contractAddress.indexOf('0x'), 0)
            assert.strictEqual(access.contractAddress, db.access.address)
          })
        })

        describe('access controls', () => {
          it('throws error if key not permitted to write', async () => {
            let err
            try {
              await db.add('hello?') // should throw error
              assert.strictEqual('Should not end here', false)
            } catch (e) {
              err = e.toString()
            }
            assert.strictEqual(err, `Error: Could not append entry, key "${id1.id}" is not allowed to write to the log`)
          })

          it('granting access enables to write to the database', async () => {
            await db.access.grant('write', id1.id)
            const doChanges = () => {
              return new Promise((resolve, reject) => {
                try {
                  db2.events.once('replicated', () => {
                    // FIXME: timeout to get rid of the "libp2p node not started yet" errors
                    setTimeout(() => resolve(), 1000)
                  })
                  db.add('hello!')
                } catch (e) {
                  reject(e)
                }
              })
            }
            // Try adding something again
            await doChanges()

            const res1 = await db.iterator().collect().map(e => e.payload.value)
            const res2 = await db2.iterator().collect().map(e => e.payload.value)
            assert.deepStrictEqual(res1, ['hello!'])
            assert.deepStrictEqual(res2, ['hello!'])
          })

          it('can\'t grant access if not admin', async () => {
            await db2.access.grant('write', id2.id)
            const canAppend = await db2.access.canAppend({ identity: id2 }, id2.provider)
            assert.strictEqual(canAppend, false)
          })

          it('can\'t revoke access if not admin', async () => {
            await db2.access.revoke('write', id1.id)
            const canAppend = await db2.access.canAppend({ identity: id1 }, id1.provider)
            assert.strictEqual(canAppend, true)
          })

          it('can check permissions without defaultAccount set', async () => {
            db2.access.defaultAccount = null
            const canAppend = await db2.access.canAppend({ identity: id1 }, id1.provider)
            assert.strictEqual(canAppend, true)
          })

          it('can\'t change permissions without from address if no defaultAccount set', async () => {
            let err
            db2.access.defaultAccount = null
            try {
              await db2.access.grant('write', id2.id)
            } catch (e) {
              err = e.toString()
            }
            assert.strictEqual(err, 'Error: No "from" address specified in neither the given options, nor the default options.')
          })

          it('can change permissions by passing in from address', async () => {
            let err
            db2.access.defaultAccount = null
            try {
              await db2.access.grant('write', id2.id, { from: accounts[i] }) // from address can grant/revoke access
            } catch (e) {
              err = e.toString()
            }
            assert.strictEqual(err, undefined)
            const canAppend = await db2.access.canAppend({ identity: id2 }, id2.provider)
            assert.strictEqual(canAppend, true)
          })

          it('revoking access disables ability to write to the database', async () => {
            let err
            try {
              // Revoke user's access
              await db.access.revoke('write', id2.id)
              await db2.add('hello?')
            } catch (e) {
              err = e.toString()
            }
            assert.strictEqual(err, `Error: Could not append entry, key "${id2.id}" is not allowed to write to the log`)
          })
        })
      })
    })
  })
})
