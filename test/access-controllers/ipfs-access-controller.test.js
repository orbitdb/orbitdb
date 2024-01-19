import { strictEqual, deepStrictEqual, notStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import Keystore from '../../src/key-store.js'
import Identities from '../../src/identities/identities.js'
import IPFSAccessController from '../../src/access-controllers/ipfs.js'
import connectPeers from '../utils/connect-nodes.js'
import createHelia from '../utils/create-helia.js'

describe('IPFSAccessController', function () {
  const dbPath1 = './orbitdb/tests/ipfs-access-controller/1'
  const dbPath2 = './orbitdb/tests/ipfs-access-controller/2'

  let ipfs1, ipfs2
  let keystore1, keystore2
  let identities1, identities2
  let testIdentity1, testIdentity2
  let orbitdb1, orbitdb2

  before(async () => {
    [ipfs1, ipfs2] = await Promise.all([createHelia(), createHelia()])
    await connectPeers(ipfs1, ipfs2)

    keystore1 = await Keystore({ path: dbPath1 + '/keys' })
    keystore2 = await Keystore({ path: dbPath2 + '/keys' })

    identities1 = await Identities({ keystore: keystore1 })
    identities2 = await Identities({ keystore: keystore2 })

    testIdentity1 = await identities1.createIdentity({ id: 'userA' })
    testIdentity2 = await identities2.createIdentity({ id: 'userB' })

    orbitdb1 = { ipfs: ipfs1, identity: testIdentity1 }
    orbitdb2 = { ipfs: ipfs2, identity: testIdentity2 }
  })

  after(async () => {
    if (ipfs1) {
      await ipfs1.stop()
    }

    if (ipfs2) {
      await ipfs2.stop()
    }

    if (keystore1) {
      await keystore1.close()
    }

    if (keystore2) {
      await keystore2.close()
    }

    await rimraf('./orbitdb')
    await rimraf('./ipfs1')
    await rimraf('./ipfs2')
  })

  let accessController

  describe('Default write access', () => {
    before(async () => {
      accessController = await IPFSAccessController()({
        orbitdb: orbitdb1,
        identities: identities1
      })
    })

    it('creates an access controller', () => {
      notStrictEqual(accessController, null)
      notStrictEqual(accessController, undefined)
    })

    it('sets the controller type', () => {
      strictEqual(accessController.type, 'ipfs')
    })

    it('sets default write', async () => {
      deepStrictEqual(accessController.write, [testIdentity1.id])
    })

    it('user with write access can append', async () => {
      const mockEntry = {
        identity: testIdentity1.hash,
        v: 1
      // ...
      // doesn't matter what we put here, only identity is used for the check
      }
      const canAppend = await accessController.canAppend(mockEntry)
      strictEqual(canAppend, true)
    })

    it('user without write cannot append', async () => {
      const mockEntry = {
        identity: testIdentity2.hash,
        v: 1
      // ...
      // doesn't matter what we put here, only identity is used for the check
      }
      const canAppend = await accessController.canAppend(mockEntry)
      strictEqual(canAppend, false)
    })

    it('replicates the access controller', async () => {
      const replicatedAccessController = await IPFSAccessController()({
        orbitdb: orbitdb2,
        identities: identities2,
        address: accessController.address
      })

      strictEqual(replicatedAccessController.type, accessController.type)
      strictEqual(replicatedAccessController.address, accessController.address)
      deepStrictEqual(replicatedAccessController.write, accessController.write)
    })
  })

  describe('Write all access', () => {
    before(async () => {
      accessController = await IPFSAccessController({ write: ['*'] })({
        orbitdb: orbitdb1,
        identities: identities1
      })
    })

    it('sets write to \'Anyone\'', async () => {
      deepStrictEqual(accessController.write, ['*'])
    })
  })
})
