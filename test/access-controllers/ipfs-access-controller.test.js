import { strictEqual, deepStrictEqual, notStrictEqual } from 'assert'
import rmrf from 'rimraf'
import * as IPFS from 'ipfs'
import Keystore from '../../src/key-store.js'
import Identities from '../../src/identities/identities.js'
import IPFSAccessController from '../../src/access-controllers/ipfs.js'
import config from '../config.js'
import connectPeers from '../utils/connect-nodes.js'

describe('IPFSAccessController', function () {
  const dbPath1 = './orbitdb/tests/ipfs-access-controller/1'
  const dbPath2 = './orbitdb/tests/ipfs-access-controller/2'

  this.timeout(config.timeout)

  let ipfs1, ipfs2
  let identities1, identities2
  let testIdentity1, testIdentity2

  before(async () => {
    ipfs1 = await IPFS.create({ ...config.daemon1, repo: './ipfs1' })
    ipfs2 = await IPFS.create({ ...config.daemon2, repo: './ipfs2' })
    await connectPeers(ipfs1, ipfs2)

    const keystore1 = await Keystore({ path: dbPath1 + '/keys' })
    const keystore2 = await Keystore({ path: dbPath2 + '/keys' })

    identities1 = await Identities({ keystore: keystore1 })
    identities2 = await Identities({ keystore: keystore2 })

    testIdentity1 = await identities1.createIdentity({ id: 'userA' })
    testIdentity2 = await identities2.createIdentity({ id: 'userB' })
  })

  after(async () => {
    if (ipfs1) {
      await ipfs1.stop()
    }

    if (ipfs2) {
      await ipfs2.stop()
    }

    await rmrf('./orbitdb')
    await rmrf('./ipfs1')
    await rmrf('./ipfs2')
  })

  let accessController

  before(async () => {
    accessController = await IPFSAccessController({
      ipfs: ipfs1,
      identities: identities1,
      identity: testIdentity1
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
    const replicatedAccessController = await IPFSAccessController({
      ipfs: ipfs2,
      identities: identities2,
      identity: testIdentity2,
      address: accessController.address
    })

    strictEqual(replicatedAccessController.type, accessController.type)
    strictEqual(replicatedAccessController.address, accessController.address)
    deepStrictEqual(replicatedAccessController.write, accessController.write)
  })
})
