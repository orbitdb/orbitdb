import { deepStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { copy } from 'fs-extra'
import { KeyStore, Identities } from '../../../src/index.js'
import KeyValue from '../../../src/databases/keyvalue.js'
import testKeysPath from '../../fixtures/test-keys-path.js'
import connectPeers from '../../utils/connect-nodes.js'
import waitFor from '../../utils/wait-for.js'
import createHelia from '../../utils/create-helia.js'

const keysPath = './testkeys'

describe('KeyValue Database Replication', function () {
  this.timeout(30000)

  let ipfs1, ipfs2
  let keystore
  let identities
  let testIdentity1, testIdentity2
  let kv1, kv2

  const databaseId = 'kv-AAA'

  const accessController = {
    canAppend: async (entry) => {
      const identity = await identities.getIdentity(entry.identity)
      return identity.id === testIdentity1.id
    }
  }

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
    if (kv1) {
      await kv1.drop()
      await kv1.close()
    }
    if (kv2) {
      await kv2.drop()
      await kv2.close()
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

    kv1 = await KeyValue()({ ipfs: ipfs1, identity: testIdentity1, address: databaseId, accessController, directory: './orbitdb1' })
    kv2 = await KeyValue()({ ipfs: ipfs2, identity: testIdentity2, address: databaseId, accessController, directory: './orbitdb2' })

    kv2.events.on('join', onConnected)
    kv2.events.on('update', onUpdate)

    kv2.events.on('error', onError)
    kv1.events.on('error', onError)

    await kv1.set('init', true)
    await kv1.set('hello', 'friend')
    await kv1.del('hello')
    await kv1.set('hello', 'friend2')
    await kv1.del('hello')
    await kv1.set('empty', '')
    await kv1.del('empty')
    expectedEntryHash = await kv1.set('hello', 'friend3')

    await waitFor(() => replicated, () => true)

    const value0 = await kv2.get('init')
    deepStrictEqual(value0, true)

    const value2 = await kv2.get('hello')
    deepStrictEqual(value2, 'friend3')

    const value1 = await kv1.get('hello')
    deepStrictEqual(value1, 'friend3')

    const value9 = await kv1.get('empty')
    deepStrictEqual(value9, undefined)

    const all2 = []
    for await (const keyValue of kv2.iterator()) {
      all2.push(keyValue)
    }
    deepStrictEqual(all2.map(e => { return { key: e.key, value: e.value } }), [
      { key: 'hello', value: 'friend3' },
      { key: 'init', value: true }
    ])

    const all1 = []
    for await (const keyValue of kv1.iterator()) {
      all1.push(keyValue)
    }
    deepStrictEqual(all1.map(e => { return { key: e.key, value: e.value } }), [
      { key: 'hello', value: 'friend3' },
      { key: 'init', value: true }
    ])
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

    kv1 = await KeyValue()({ ipfs: ipfs1, identity: testIdentity1, address: databaseId, accessController, directory: './orbitdb1' })
    kv2 = await KeyValue()({ ipfs: ipfs2, identity: testIdentity2, address: databaseId, accessController, directory: './orbitdb2' })

    kv2.events.on('join', onConnected)
    kv1.events.on('join', onConnected)
    kv2.events.on('update', onUpdate)
    kv2.events.on('error', onError)
    kv1.events.on('error', onError)

    await kv1.set('init', true)
    await kv1.set('hello', 'friend')
    await kv1.del('hello')
    await kv1.set('hello', 'friend2')
    await kv1.del('hello')
    await kv1.set('empty', '')
    await kv1.del('empty')
    expectedEntryHash = await kv1.set('hello', 'friend3')

    await waitFor(() => replicated, () => true)

    await kv1.close()
    await kv2.close()

    kv1 = await KeyValue()({ ipfs: ipfs1, identity: testIdentity1, address: databaseId, accessController, directory: './orbitdb1' })
    kv2 = await KeyValue()({ ipfs: ipfs2, identity: testIdentity2, address: databaseId, accessController, directory: './orbitdb2' })

    const value0 = await kv2.get('init')
    deepStrictEqual(value0, true)

    const value2 = await kv2.get('hello')
    deepStrictEqual(value2, 'friend3')

    const value1 = await kv1.get('hello')
    deepStrictEqual(value1, 'friend3')

    const value9 = await kv1.get('empty')
    deepStrictEqual(value9, undefined)

    const all2 = []
    for await (const keyValue of kv2.iterator()) {
      all2.push(keyValue)
    }
    deepStrictEqual(all2.map(e => { return { key: e.key, value: e.value } }), [
      { key: 'hello', value: 'friend3' },
      { key: 'init', value: true }
    ])

    const all1 = []
    for await (const keyValue of kv1.iterator()) {
      all1.push(keyValue)
    }
    deepStrictEqual(all1.map(e => { return { key: e.key, value: e.value } }), [
      { key: 'hello', value: 'friend3' },
      { key: 'init', value: true }
    ])
  })
})
