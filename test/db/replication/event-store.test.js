import { deepStrictEqual } from 'assert'
import rimraf from 'rimraf'
import { Log, Entry } from '../../../src/oplog/index.js'
import { Feed, Database } from '../../../src/db/index.js'
import { IPFSBlockStorage, LevelStorage } from '../../../src/storage/index.js'
import { getIpfsPeerId, waitForPeers, config, testAPIs, startIpfs, stopIpfs } from 'orbit-db-test-utils'
import connectPeers from '../../utils/connect-nodes.js'
import { createTestIdentities, cleanUpTestIdentities } from '../../fixtures/orbit-db-identity-keys.js'
import waitFor from '../../utils/wait-for.js'

const { sync: rmrf } = rimraf

const OpLog = { Log, Entry, IPFSBlockStorage, LevelStorage }

Object.keys(testAPIs).forEach((IPFS) => {
  describe('Feed Replication (' + IPFS + ')', function () {
    this.timeout(config.timeout * 2)

    let ipfsd1, ipfsd2
    let ipfs1, ipfs2
    let keystore, signingKeyStore
    let peerId1, peerId2
    let accessController
    let identities1, identities2
    let testIdentity1, testIdentity2
    let db1, db2

    const databaseId = 'feed-AAA'

    before(async () => {
      // Start two IPFS instances
      ipfsd1 = await startIpfs(IPFS, config.daemon1)
      ipfsd2 = await startIpfs(IPFS, config.daemon2)
      ipfs1 = ipfsd1.api
      ipfs2 = ipfsd2.api

      await connectPeers(ipfs1, ipfs2)

      // Get the peer IDs
      peerId1 = await getIpfsPeerId(ipfs1)
      peerId2 = await getIpfsPeerId(ipfs2)

      const [identities, testIdentities] = await createTestIdentities(ipfs1, ipfs2)
      identities1 = identities[0]
      identities2 = identities[1]
      testIdentity1 = testIdentities[0]
      testIdentity2 = testIdentities[1]

      accessController = {
        canAppend: async (entry) => {
          const identity1 = await identities1.getIdentity(entry.identity)
          const identity2 = await identities2.getIdentity(entry.identity)
          return identity1.id === testIdentity1.id || identity2.id === testIdentity2.id
        }
      }

      rmrf(testIdentity1.id)
      rmrf(testIdentity2.id)
    })

    after(async () => {
      await cleanUpTestIdentities([identities1, identities2])

      if (ipfsd1) {
        await stopIpfs(ipfsd1)
      }
      if (ipfsd2) {
        await stopIpfs(ipfsd2)
      }
      if (keystore) {
        await keystore.close()
      }
      if (signingKeyStore) {
        await signingKeyStore.close()
      }
      if (testIdentity1) {
        rmrf(testIdentity1.id)
      }
      if (testIdentity2) {
        rmrf(testIdentity2.id)
      }
    })

    beforeEach(async () => {
      db1 = await Feed({ OpLog, Database, ipfs: ipfs1, identity: testIdentity1, databaseId, accessController })
      db2 = await Feed({ OpLog, Database, ipfs: ipfs2, identity: testIdentity2, databaseId, accessController })
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

    it('gets all documents', async () => {
      let updateDB1Count = 0
      let updateDB2Count = 0

      const onDB1Update = (entry) => {
        ++updateDB1Count
      }

      const onDB2Update = (entry) => {
        ++updateDB2Count
      }

      db1.events.on('update', onDB1Update)
      db2.events.on('update', onDB2Update)

      await waitForPeers(ipfs1, [peerId2], databaseId)
      await waitForPeers(ipfs2, [peerId1], databaseId)

      const puts = []
      puts.push(await db1.add('init'))
      puts.push(await db2.add(true))
      puts.push(await db1.add('hello'))
      puts.push(await db2.add('friend'))
      puts.push(await db2.add('12345'))
      puts.push(await db2.add('empty'))
      puts.push(await db2.add(''))
      puts.push(await db2.add('friend33'))

      await waitFor(() => updateDB1Count, () => puts.length)
      await waitFor(() => updateDB2Count, () => puts.length)

      const all1 = []
      for await (const record of db1.iterator()) {
        all1.unshift(record)
      }

      const all2 = []
      for await (const record of db2.iterator()) {
        all2.unshift(record)
      }

      deepStrictEqual(all1, all2)
    })
  })
})
