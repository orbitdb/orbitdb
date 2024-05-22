import { strictEqual } from 'assert'
import { rimraf } from 'rimraf'
import path from 'path'
import OrbitDB from '../src/orbitdb.js'
// import waitFor from './utils/wait-for.js'
import connectPeers from './utils/connect-nodes.js'
// import IPFSAccessController from '../src/access-controllers/ipfs.js'
// import OrbitDBAccessController from '../src/access-controllers/orbitdb.js'
import createHelia from './utils/create-helia.js'
import { encrypt, decrypt } from './utils/encrypt.js'

const dbPath = './orbitdb/tests/write-permissions'

describe('Encryption/Decryption', function () {
  this.timeout(20000)

  let ipfs1, ipfs2
  let orbitdb1, orbitdb2
  let db1 /*, db2 */

  before(async () => {
    [ipfs1, ipfs2] = await Promise.all([createHelia(), createHelia()])
    await connectPeers(ipfs1, ipfs2)

    orbitdb1 = await OrbitDB({ ipfs: ipfs1, id: 'user1', directory: path.join(dbPath, '1') })
    orbitdb2 = await OrbitDB({ ipfs: ipfs2, id: 'user2', directory: path.join(dbPath, '2') })
  })

  after(async () => {
    if (orbitdb1) {
      await orbitdb1.stop()
    }

    if (orbitdb2) {
      await orbitdb2.stop()
    }

    if (ipfs1) {
      await ipfs1.stop()
    }

    if (ipfs2) {
      await ipfs2.stop()
    }

    await rimraf('./orbitdb')
    await rimraf('./ipfs1')
    await rimraf('./ipfs2')
  })

  afterEach(async () => {
    await db1.drop()
    await db1.close()

    // await db2.drop()
    // await db2.close()
  })

  it('encrypts/decrypts data', async () => {
    const keystore = orbitdb1.keystore
    const keys = await keystore.createKey('encryption-test')

    const privateKey = await keystore.getKey('encryption-test')
    const publicKey = await keystore.getPublic(keys)

    const encryptFn = encrypt({ publicKey })
    const decryptFn = decrypt({ privateKey })
    db1 = await orbitdb1.open('encryption-test-1', { encrypt: { data: { encryptFn, decryptFn } } })

    const hash = await db1.add('record 1')
    strictEqual(await db1.get(hash), 'record 1')
  })

  it('encrypts/decrypts op', async () => {
    const keystore = orbitdb1.keystore
    const keys = await keystore.createKey('encryption-test')

    const privateKey = await keystore.getKey('encryption-test')
    const publicKey = await keystore.getPublic(keys)

    const encryptFn = encrypt({ publicKey })
    const decryptFn = decrypt({ privateKey })
    db1 = await orbitdb1.open('encryption-test-1', { encrypt: { op: { encryptFn, decryptFn } } })

    const hash = await db1.add('record 1')
    strictEqual(await db1.get(hash), 'record 1')
  })
})
