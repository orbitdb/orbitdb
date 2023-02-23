import { deepStrictEqual } from 'assert'
import rimraf from 'rimraf'
import { Log, Entry } from '../../../src/oplog/index.js'
import { KeyValue, Database } from '../../../src/db/index.js'
import { IPFSBlockStorage, LevelStorage } from '../../../src/storage/index.js'
import { getIpfsPeerId, waitForPeers, config, testAPIs, startIpfs, stopIpfs } from 'orbit-db-test-utils'
import connectPeers from '../../utils/connect-nodes.js'
import { createTestIdentities, cleanUpTestIdentities } from '../../fixtures/orbit-db-identity-keys.js'
import waitFor from '../../utils/wait-for.js'

const { sync: rmrf } = rimraf

const OpLog = { Log, Entry, IPFSBlockStorage, LevelStorage }

Object.keys(testAPIs).forEach((IPFS) => {
  describe('KeyValue Replication (' + IPFS + ')', function () {
    this.timeout(config.timeout * 2)

    let ipfsd1, ipfsd2
    let ipfs1, ipfs2
    let keystore, signingKeyStore
    let peerId1, peerId2
    let accessController
    let identities1, identities2
    let testIdentity1, testIdentity2
    let db1, db2

    const databaseId = 'keyvalue-AAA'

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
      db1 = await KeyValue({ OpLog, Database, ipfs: ipfs1, identity: testIdentity1, databaseId, accessController })
      db2 = await KeyValue({ OpLog, Database, ipfs: ipfs2, identity: testIdentity2, databaseId, accessController })
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

    it('gets all key/value pairs', async () => {
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

      const ops = []
      ops.push(await db1.put('key1', 'init'))
      ops.push(await db2.put('key2', true))
      ops.push(await db1.put('key3', 'hello'))
      ops.push(await db2.put('key4', 'friend'))
      ops.push(await db2.put('key5', '12345'))
      ops.push(await db2.put('key6', 'empty'))
      ops.push(await db2.put('key7', ''))
      ops.push(await db2.put('key8', 'friend33'))

      await waitFor(() => updateDB1Count, () => ops.length)
      await waitFor(() => updateDB2Count, () => ops.length)

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
