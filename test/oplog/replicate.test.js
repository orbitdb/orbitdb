import { strictEqual } from 'assert'
import rimraf from 'rimraf'
import { copy } from 'fs-extra'
import { Log, Entry } from '../../src/index.js'
import { MemoryStorage, IPFSBlockStorage } from '../../src/storage/index.js'
import { Identities } from '../../src/identities/index.js'
import KeyStore from '../../src/key-store.js'

// Test utils
import { config, testAPIs, startIpfs, stopIpfs, getIpfsPeerId, waitForPeers, connectPeers } from 'orbit-db-test-utils'
import { createTestIdentities, cleanUpTestIdentities } from '../fixtures/orbit-db-identity-keys.js'

const { sync: rmrf } = rimraf
const { createIdentity } = Identities

Object.keys(testAPIs).forEach((IPFS) => {
  describe('ipfs-log - Replication (' + IPFS + ')', function () {
    this.timeout(config.timeout * 2)

    const { identityKeyFixtures, signingKeyFixtures, identityKeysPath, signingKeysPath } = config

    let ipfsd1, ipfsd2
    let ipfs1, ipfs2
    let id1, id2

    let keystore, signingKeyStore
    let identities1, identities2
    let testIdentity1, testIdentity2
    let storage1, storage2

    before(async () => {
      rmrf(identityKeysPath)
      rmrf(signingKeysPath)
      await copy(identityKeyFixtures, identityKeysPath)
      await copy(signingKeyFixtures, signingKeysPath)

      // Start two IPFS instances
      ipfsd1 = await startIpfs(IPFS, config.daemon1)
      ipfsd2 = await startIpfs(IPFS, config.daemon2)
      ipfs1 = ipfsd1.api
      ipfs2 = ipfsd2.api

      await connectPeers(ipfs1, ipfs2)

      // Get the peer IDs
      id1 = await getIpfsPeerId(ipfs1)
      id2 = await getIpfsPeerId(ipfs2)

      const [identities, testIdentities] = await createTestIdentities(ipfs1, ipfs2)
      identities1 = identities[0]
      identities2 = identities[1]
      testIdentity2 = testIdentities[0]
      testIdentity1 = testIdentities[1]

      storage1 = await IPFSBlockStorage({ ipfs: ipfs1 })
      storage2 = await IPFSBlockStorage({ ipfs: ipfs2 })
    })

    after(async () => {
      await cleanUpTestIdentities([identities1, identities2])
      await stopIpfs(ipfsd1)
      await stopIpfs(ipfsd2)
      await storage1.close()
      await storage2.close()
    })

    describe('replicates logs deterministically', async function () {
      const amount = 128 + 1
      const logId = 'A'

      let log1, log2, input1, input2

      const handleMessage1 = async (message) => {
        const { id: peerId } = await ipfs1.id()
        const messageIsFromMe = (message) => String(peerId) === String(message.from)
        try {
          if (!messageIsFromMe(message)) {
            const entry = await Entry.decode(message.data)
            await storage1.put(entry.hash, entry.bytes)
            await log1.joinEntry(entry)
          }
        } catch (e) {
          console.error(e)
        }
      }

      const handleMessage2 = async (message) => {
        const { id: peerId } = await ipfs2.id()
        const messageIsFromMe = (message) => String(peerId) === String(message.from)
        try {
          if (!messageIsFromMe(message)) {
            const entry = await Entry.decode(message.data)
            await storage2.put(entry.hash, entry.bytes)
            await log2.joinEntry(entry)
          }
        } catch (e) {
          console.error(e)
        }
      }

      beforeEach(async () => {
        log1 = await Log(testIdentity1, { logId, storage: storage1 })
        log2 = await Log(testIdentity2, { logId, storage: storage2 })
        input1 = await Log(testIdentity1, { logId, storage: storage1 })
        input2 = await Log(testIdentity2, { logId, storage: storage2 })
        await ipfs1.pubsub.subscribe(logId, handleMessage1)
        await ipfs2.pubsub.subscribe(logId, handleMessage2)
      })

      afterEach(async () => {
        await ipfs1.pubsub.unsubscribe(logId, handleMessage1)
        await ipfs2.pubsub.unsubscribe(logId, handleMessage2)
      })

      it('replicates logs', async () => {
        await waitForPeers(ipfs1, [id2], logId)
        await waitForPeers(ipfs2, [id1], logId)

        for (let i = 1; i <= amount; i++) {
          const entry1 = await input1.append('A' + i)
          const entry2 = await input2.append('B' + i)
          await ipfs1.pubsub.publish(logId, entry1.bytes)
          await ipfs2.pubsub.publish(logId, entry2.bytes)
        }

        console.log('Messages sent')

        const whileProcessingMessages = (timeoutMs) => {
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('timeout')), timeoutMs)
            const timer = setInterval(async () => {
              const valuesA = await log1.values()
              const valuesB = await log2.values()
              if (valuesA.length + valuesB.length === amount * 2) {
                clearInterval(timer)
                clearTimeout(timeout)
                console.log('Messages received')
                resolve()
              }
            }, 200)
          })
        }

        await whileProcessingMessages(config.timeout)

        const result = await Log(testIdentity1, { logId, storage: storage1 })
        await result.join(log1)
        await result.join(log2)

        const values1 = await log1.values()
        const values2 = await log2.values()
        const values3 = await result.values()

        strictEqual(values1.length, amount)
        strictEqual(values2.length, amount)
        strictEqual(values3.length, amount * 2)
        strictEqual(values3[0].payload, 'A1')
        strictEqual(values3[1].payload, 'B1')
        strictEqual(values3[2].payload, 'A2')
        strictEqual(values3[3].payload, 'B2')
        strictEqual(values3[99].payload, 'B50')
        strictEqual(values3[100].payload, 'A51')
        strictEqual(values3[198].payload, 'A100')
        strictEqual(values3[199].payload, 'B100')
      })
    })
  })
})
