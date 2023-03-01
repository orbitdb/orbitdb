import { deepStrictEqual } from 'assert'
import rmrf from 'rimraf'
import { Log, Entry } from '../../../src/oplog/index.js'
import { EventStore } from '../../../src/db/index.js'
import { Database } from '../../../src/index.js'
import { IPFSBlockStorage, LevelStorage } from '../../../src/storage/index.js'

// Test utils
import { config, startIpfs, stopIpfs } from 'orbit-db-test-utils'
import connectPeers from '../../utils/connect-nodes.js'
import waitFor from '../../utils/wait-for.js'
import { createTestIdentities, cleanUpTestIdentities } from '../../fixtures/orbit-db-identity-keys.js'

const OpLog = { Log, Entry, IPFSBlockStorage, LevelStorage }
const IPFS = 'js-ipfs'

describe('Events Database Replication', function () {
  this.timeout(5000)

  let ipfsd1, ipfsd2
  let ipfs1, ipfs2
  let identities1, identities2
  let testIdentity1, testIdentity2
  let db1, db2

  const databaseId = 'events-AAA'

  const accessController = {
    canAppend: async (entry) => {
      const identity = await identities1.getIdentity(entry.identity)
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
    if (db1) {
      await db1.drop()
      await db1.close()
    }
    if (db2) {
      await db2.drop()
      await db2.close()
    }
  })

  it('replicates a database', async () => {
    let connected = false
    let updateCount = 0

    const onConnected = async (peerId) => {
      connected = true
    }

    const onUpdate = async (peerId) => {
      ++updateCount
    }

    const onError = (err) => {
      console.error(err)
    }

    db1 = await EventStore({ OpLog, Database, ipfs: ipfs1, identity: testIdentity1, address: databaseId, accessController, directory: './orbitdb1' })
    db2 = await EventStore({ OpLog, Database, ipfs: ipfs2, identity: testIdentity2, address: databaseId, accessController, directory: './orbitdb2' })

    db2.events.on('join', onConnected)
    db1.events.on('join', onConnected)
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
    await db1.add(expected[7])

    await waitFor(() => connected, () => true)
    await waitFor(() => updateCount > 0, () => true)

    const all2 = []
    for await (const event of db2.iterator()) {
      all2.unshift(event)
    }
    deepStrictEqual(all2, expected)

    const all1 = await db2.all()
    deepStrictEqual(all1, expected)
  })

  it('loads the database after replication', async () => {
    db1 = await EventStore({ OpLog, Database, ipfs: ipfs1, identity: testIdentity1, address: databaseId, accessController, directory: './orbitdb1' })
    db2 = await EventStore({ OpLog, Database, ipfs: ipfs2, identity: testIdentity2, address: databaseId, accessController, directory: './orbitdb2' })

    let connected = false
    let updateCount = 0

    const onConnected = async (peerId) => {
      connected = true
    }

    const onUpdate = async (peerId) => {
      ++updateCount
    }

    const onError = (err) => {
      console.error(err)
    }

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
    await db1.add(expected[7])

    await waitFor(() => connected, () => true)
    await waitFor(() => updateCount > 0, () => true)

    await db1.drop()
    await db1.close()
    db1 = null

    await db2.close()

    db2 = await EventStore({ OpLog, Database, ipfs: ipfs2, identity: testIdentity2, address: databaseId, accessController, directory: './orbitdb2' })

    const all2 = []
    for await (const event of db2.iterator()) {
      all2.unshift(event)
    }
    deepStrictEqual(all2, expected)

    const all1 = await db2.all()
    deepStrictEqual(all1, expected)
  })
})
