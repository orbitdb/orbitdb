import { deepStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { copy } from 'fs-extra'
import { KeyStore, Identities } from '../../../src/index.js'
import Events from '../../../src/databases/events.js'
import testKeysPath from '../../fixtures/test-keys-path.js'
import connectPeers from '../../utils/connect-nodes.js'
import waitFor from '../../utils/wait-for.js'
import createHelia from '../../utils/create-helia.js'

const keysPath = './testkeys'

describe('Events Database Replication', function () {
  this.timeout(30000)

  let ipfs1, ipfs2
  let keystore
  let identities
  let testIdentity1, testIdentity2
  let db1, db2

  const databaseId = 'events-AAA'

  const accessController = {
    canAppend: async (entry) => {
      const identity = await identities.getIdentity(entry.identity)
      return identity.id === testIdentity1.id
    }
  }

  const expected = [
    'init',
    true,
    'hello',
    'friend',
    12345,
    'empty',
    '',
    'friend33'
  ]

  before(async () => {
    [ipfs1, ipfs2] = await Promise.all([createHelia(), createHelia()])
    await connectPeers(ipfs1, ipfs2)

    await copy(testKeysPath, keysPath)
    keystore = await KeyStore({ path: keysPath })
    identities = await Identities({ keystore })
    testIdentity1 = await identities.createIdentity({ id: 'userA' })
    testIdentity2 = await identities.createIdentity({ id: 'userB' })
  })

  after(async () => {
    if (ipfs1) {
      await ipfs1.stop()
    }

    if (ipfs2) {
      await ipfs2.stop()
    }

    if (keystore) {
      await keystore.close()
    }

    await rimraf(keysPath)
    await rimraf('./orbitdb1')
    await rimraf('./orbitdb2')
    await rimraf('./ipfs1')
    await rimraf('./ipfs2')
  })

  afterEach(async () => {
    if (db1) {
      await db1.drop()
      await db1.close()
      db1 = null
    }
    if (db2) {
      await db2.drop()
      await db2.close()
      db2 = null
    }
  })

  it('replicates a database', async () => {
    let replicated = false
    let expectedEntryHash = null

    const onConnected = (peerId, heads) => {
      replicated = expectedEntryHash !== null && heads.map(e => e.hash).includes(expectedEntryHash)
    }

    const onUpdate = (entry) => {
      replicated = expectedEntryHash !== null && entry.hash === expectedEntryHash
    }

    const onError = (err) => {
      console.error(err)
    }

    db1 = await Events()({ ipfs: ipfs1, identity: testIdentity1, address: databaseId, accessController, directory: './orbitdb1' })
    db2 = await Events()({ ipfs: ipfs2, identity: testIdentity2, address: databaseId, accessController, directory: './orbitdb2' })

    db2.events.on('join', onConnected)
    db2.events.on('update', onUpdate)

    db2.events.on('error', onError)
    db1.events.on('error', onError)

    await db1.add(expected[0])
    await db1.add(expected[1])
    await db1.add(expected[2])
    await db1.add(expected[3])
    await db1.add(expected[4])
    await db1.add(expected[5])
    await db1.add(expected[6])
    expectedEntryHash = await db1.add(expected[7])

    await waitFor(() => replicated, () => true)

    const all2 = []
    for await (const event of db2.iterator()) {
      all2.unshift(event)
    }
    deepStrictEqual(all2.map(e => e.value), expected)

    const all1 = await db2.all()
    deepStrictEqual(all1.map(e => e.value), expected)
  })

  it('loads the database after replication', async () => {
    let replicated = false
    let expectedEntryHash = null

    const onConnected = (peerId, heads) => {
      replicated = expectedEntryHash !== null && heads.map(e => e.hash).includes(expectedEntryHash)
    }

    const onUpdate = (entry) => {
      replicated = expectedEntryHash !== null && entry.hash === expectedEntryHash
    }

    const onError = (err) => {
      console.error(err)
    }

    db1 = await Events()({ ipfs: ipfs1, identity: testIdentity1, address: databaseId, accessController, directory: './orbitdb1' })
    db2 = await Events()({ ipfs: ipfs2, identity: testIdentity2, address: databaseId, accessController, directory: './orbitdb2' })

    db2.events.on('join', onConnected)
    db2.events.on('update', onUpdate)

    db2.events.on('error', onError)
    db1.events.on('error', onError)

    await db1.add(expected[0])
    await db1.add(expected[1])
    await db1.add(expected[2])
    await db1.add(expected[3])
    await db1.add(expected[4])
    await db1.add(expected[5])
    await db1.add(expected[6])
    expectedEntryHash = await db1.add(expected[7])

    await waitFor(() => replicated, () => true)

    await db1.drop()
    await db1.close()
    db1 = null

    await db2.close()

    db2 = await Events()({ ipfs: ipfs2, identity: testIdentity2, address: databaseId, accessController, directory: './orbitdb2' })

    const all2 = []
    for await (const event of db2.iterator()) {
      all2.unshift(event)
    }
    deepStrictEqual(all2.map(e => e.value), expected)

    const all1 = await db2.all()
    deepStrictEqual(all1.map(e => e.value), expected)
  })
})
