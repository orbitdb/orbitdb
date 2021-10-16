'use strict'

const assert = require('assert')
const rmrf = require('rimraf')
const OrbitDB = require('../../src/OrbitDB.js')
const IdentityProvider = require('orbit-db-identity-provider')
const Keystore = require('orbit-db-keystore')
const IPFSAccessController = require('orbit-db-access-controllers/src/ipfs-access-controller')
const AccessControllers = require('orbit-db-access-controllers')

// Include test utilities
const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs
} = require('orbit-db-test-utils')

const dbPath1 = './orbitdb/tests/ipfs-access-controller/1'
const dbPath2 = './orbitdb/tests/ipfs-access-controller/2'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - IPFSAccessController (${API})`, function () {
    this.timeout(config.timeout)

    let ipfsd1, ipfsd2, ipfs1, ipfs2, id1, id2
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

    describe('Constructor', function () {
      let accessController

      before(async () => {
        accessController = await IPFSAccessController.create(orbitdb1, {
          write: [id1.id]
        })
      })

      it('creates an access controller', () => {
        assert.notStrictEqual(accessController, null)
        assert.notStrictEqual(accessController, undefined)
      })

      it('sets the controller type', () => {
        assert.strictEqual(accessController.type, 'ipfs')
      })

      it('has IPFS instance', async () => {
        const peerId1 = await accessController._ipfs.id()
        const peerId2 = await ipfs1.id()
        assert.strictEqual(peerId1.id, peerId2.id)
      })

      it('sets default capabilities', async () => {
        assert.deepStrictEqual(accessController.write, [id1.id])
      })

      it('allows owner to append after creation', async () => {
        const mockEntry = {
          identity: id1,
          v: 1
          // ...
          // doesn't matter what we put here, only identity is used for the check
        }
        const canAppend = await accessController.canAppend(mockEntry, id1.provider)
        assert.strictEqual(canAppend, true)
      })
    })

    describe('save and load', function () {
      let accessController, manifest

      before(async () => {
        accessController = await IPFSAccessController.create(orbitdb1, {
          write: ['A', 'B', id1.id]
        })
        manifest = await accessController.save()
        await accessController.load(manifest.address)
      })

      it('has correct capabalities', async () => {
        assert.deepStrictEqual(accessController.write, ['A', 'B', id1.id])
      })
    })
  })
})
