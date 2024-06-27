import { strictEqual } from 'assert'
import { rimraf } from 'rimraf'
import path from 'path'
import OrbitDB from '../src/orbitdb.js'
// import waitFor from './utils/wait-for.js'
import connectPeers from './utils/connect-nodes.js'
import waitFor from './utils/wait-for.js'
// import IPFSAccessController from '../src/access-controllers/ipfs.js'
// import OrbitDBAccessController from '../src/access-controllers/orbitdb.js'
import createHelia from './utils/create-helia.js'
import { encrypt, decrypt, generatePassword } from './utils/encrypt.js'

const dbPath = './orbitdb/tests/write-permissions'

describe.only('Encryption/Decryption', function () {
  this.timeout(5000)

  let ipfs1, ipfs2
  let orbitdb1, orbitdb2
  let db1, db2
  let encryptionPassword

  before(async () => {
    [ipfs1, ipfs2] = await Promise.all([createHelia(), createHelia()])
    await connectPeers(ipfs1, ipfs2)

    await rimraf('./orbitdb')

    orbitdb1 = await OrbitDB({ ipfs: ipfs1, id: 'user1', directory: path.join(dbPath, '1') })
    orbitdb2 = await OrbitDB({ ipfs: ipfs2, id: 'user2', directory: path.join(dbPath, '2') })

    encryptionPassword = await generatePassword()
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
    await db2.drop()
    await db2.close()
  })

  it.skip('encrypts/decrypts payload', async () => {
    const encryptPayloadFn = encrypt({ password: encryptionPassword })
    const decryptPayloadFn = decrypt({ password: encryptionPassword })

    db1 = await orbitdb1.open('encryption-test-1', { encryption: { encryptPayloadFn, decryptPayloadFn } })

    const hash = await db1.add('record 1')

    for await (const e of db1.log.iterator()) {
      console.log('>', e)
    }

    strictEqual(await db1.get(hash), 'record 1')
  })

  it.only('encrypts/decrypts entry', async () => {
    let connected = false
    let updated = false
    let error = false

    const encryptPayloadFn = encrypt({ password: encryptionPassword })
    const decryptPayloadFn = decrypt({ password: encryptionPassword })

    const encryptEntryFn = encrypt({ password: encryptionPassword })
    const decryptEntryFn = decrypt({ password: encryptionPassword })

    // const decryptPayloadFn2 = encrypt({ password: encryptionPassword + '1' })
    // const decryptEntryFn2 = decrypt({ password: encryptionPassword + '2' })

    db1 = await orbitdb1.open('encryption-test-1', { encryption: { encryptEntryFn, decryptEntryFn, encryptPayloadFn, decryptPayloadFn } })
    db2 = await orbitdb2.open(db1.address, { encryption: { encryptEntryFn, decryptEntryFn, encryptPayloadFn, decryptPayloadFn } })
    // db1 = await orbitdb1.open('encryption-test-1', { encryption: { encryptEntryFn, decryptEntryFn } })
    // db2 = await orbitdb2.open(db1.address, { encryption: { encryptEntryFn, decryptEntryFn } })
    // db1 = await orbitdb1.open('encryption-test-1', { encryption: { encryptPayloadFn, decryptPayloadFn } })
    // db2 = await orbitdb2.open(db1.address, { encryption: { encryptPayloadFn, decryptPayloadFn } })
    // db1 = await orbitdb1.open('encryption-test-1')
    // db2 = await orbitdb2.open(db1.address)

    console.log('connect')

    const onJoin = async (peerId, heads) => {
      console.log('connected')
      connected = true
    }
    db2.events.on('join', onJoin)

    await waitFor(() => connected, () => true)

    const onUpdate = async (peerId, heads) => {
      console.log('updated')
      updated = true
    }
    db2.events.on('update', onUpdate)

    const onError = async (err) => {
      // Catch "Could not decrypt entry" errors
      console.log(err)
      error = true
    }
    db2.events.on('error', onError)

    console.log('write')
    const hash1 = await db1.add('record 1')
    console.log('hash1', hash1)
    const hash2 = await db1.add('record 2')
    console.log('hash2', hash2)

    strictEqual(await db1.get(hash1), 'record 1')
    strictEqual(await db1.get(hash2), 'record 2')

    await waitFor(() => updated || error, () => true)

    const all = await db2.all()
    console.log('all', all)

    strictEqual(all.length, 2)
    strictEqual(all[0].value, 'record 1')
    strictEqual(all[1].value, 'record 2')
  })
})
