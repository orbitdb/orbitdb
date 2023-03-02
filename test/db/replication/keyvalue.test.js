import { deepStrictEqual } from 'assert'
import rmrf from 'rimraf'
import { Log, Entry } from '../../../src/index.js'
import { KeyValue, KeyValuePersisted } from '../../../src/db/index.js'
import { Database } from '../../../src/index.js'
import { config, startIpfs, stopIpfs } from 'orbit-db-test-utils'
import connectPeers from '../../utils/connect-nodes.js'
import waitFor from '../../utils/wait-for.js'
import { createTestIdentities, cleanUpTestIdentities } from '../../fixtures/orbit-db-identity-keys.js'

const OpLog = { Log, Entry }
const IPFS = 'js-ipfs'

describe('KeyValue Database Replication', function () {
  this.timeout(5000)

  let ipfsd1, ipfsd2
  let ipfs1, ipfs2
  let identities1, identities2
  let testIdentity1, testIdentity2
  let kv1, kv2

  const databaseId = 'kv-AAA'

  const accessController = {
    canAppend: async (entry) => {
      const identity = await identities1.getIdentity(entry.identity)
      return identity.id === testIdentity1.id
    }
  }

  before(async () => {
    ipfsd1 = await startIpfs(IPFS, config.daemon1)
    ipfsd2 = await startIpfs(IPFS, config.daemon2)
    ipfs1 = ipfsd1.api
    ipfs2 = ipfsd2.api

    await connectPeers(ipfs1, ipfs2)

    const [identities, testIdentities] = await createTestIdentities(ipfs1, ipfs2)
    identities1 = identities[0]
    identities2 = identities[1]
    testIdentity1 = testIdentities[0]
    testIdentity2 = testIdentities[1]

    await rmrf('./orbitdb1')
    await rmrf('./orbitdb2')
  })

  after(async () => {
    await cleanUpTestIdentities([identities1, identities2])

    if (ipfsd1) {
      await stopIpfs(ipfsd1)
    }
    if (ipfsd2) {
      await stopIpfs(ipfsd2)
    }

    await rmrf('./orbitdb1')
    await rmrf('./orbitdb2')
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
    let connected = false
    let updateCount = 0

    const onConnected = async (peerId) => {
      connected = true
    }

    const onUpdate = (entry) => {
      ++updateCount
    }

    const onError = (err) => {
      console.error(err)
    }

    kv1 = await KeyValuePersisted({ KeyValue, OpLog, Database, ipfs: ipfs1, identity: testIdentity1, address: databaseId, accessController, directory: './orbitdb1' })
    kv2 = await KeyValuePersisted({ KeyValue, OpLog, Database, ipfs: ipfs2, identity: testIdentity2, address: databaseId, accessController, directory: './orbitdb2' })

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
    await kv1.set('hello', 'friend3')

    await waitFor(() => connected, () => true)
    await waitFor(() => updateCount > 0, () => true)

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
    deepStrictEqual(all2, [
      { key: 'hello', value: 'friend3' },
      { key: 'init', value: true }
    ])

    const all1 = []
    for await (const keyValue of kv1.iterator()) {
      all1.push(keyValue)
    }
    deepStrictEqual(all1, [
      { key: 'hello', value: 'friend3' },
      { key: 'init', value: true }
    ])
  })

  it('loads the database after replication', async () => {
    let updateCount = 0
    let connected = false

    const onConnected = async (peerId) => {
      connected = true
    }

    const onUpdate = (entry) => {
      ++updateCount
    }

    const onError = (err) => {
      console.error(err)
    }

    kv1 = await KeyValuePersisted({ KeyValue, OpLog, Database, ipfs: ipfs1, identity: testIdentity1, address: databaseId, accessController, directory: './orbitdb1' })
    kv2 = await KeyValuePersisted({ KeyValue, OpLog, Database, ipfs: ipfs2, identity: testIdentity2, address: databaseId, accessController, directory: './orbitdb2' })

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
    await kv1.set('hello', 'friend3')

    await waitFor(() => connected, () => true)
    await waitFor(() => updateCount > 0, () => true)

    await kv1.close()
    await kv2.close()

    kv1 = await KeyValuePersisted({ KeyValue, OpLog, Database, ipfs: ipfs1, identity: testIdentity1, address: databaseId, accessController, directory: './orbitdb1' })
    kv2 = await KeyValuePersisted({ KeyValue, OpLog, Database, ipfs: ipfs2, identity: testIdentity2, address: databaseId, accessController, directory: './orbitdb2' })

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
    deepStrictEqual(all2, [
      { key: 'hello', value: 'friend3' },
      { key: 'init', value: true }
    ])

    const all1 = []
    for await (const keyValue of kv1.iterator()) {
      all1.push(keyValue)
    }
    deepStrictEqual(all1, [
      { key: 'hello', value: 'friend3' },
      { key: 'init', value: true }
    ])
  })
})
