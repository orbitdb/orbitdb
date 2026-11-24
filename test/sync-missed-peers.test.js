import { strictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { createOrbitDB } from '../src/index.js'
import connectPeers from './utils/connect-nodes.js'
import createHelia from './utils/create-helia.js'

/**
 * Sync must not depend on who happened to be listening at the right instant.
 * See orbitdb/orbitdb#1255.
 *
 * Two gaps are covered here:
 *
 * - Heads that arrive through the heads exchange were never published on the
 *   topic. A peer in the middle (a relay that pins) learnt an entry and kept it
 *   to itself, so a reader connected only to that peer never received it.
 * - Peers that were subscribed before a database opened produced no
 *   `subscription-change` for the opener, so it never started an exchange with
 *   them. It relied on the other side dialling, and that dial has no retry.
 */

const waitUntil = async (check, timeoutMs = 15000, intervalMs = 100) => {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const value = await check()
    if (value) return value
    if (Date.now() > deadline) return null
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

describe('Sync with peers it would otherwise miss', function () {
  this.timeout(60000)

  describe('a reader connected only through a relay', () => {
    let ipfsA, ipfsB, ipfsR
    let orbitdbA, orbitdbB, orbitdbR

    before(async () => {
      [ipfsA, ipfsB, ipfsR] = await Promise.all([createHelia(), createHelia(), createHelia()])
      // A star: the writer and the reader each know only the relay.
      await connectPeers(ipfsR, ipfsA)
      await connectPeers(ipfsR, ipfsB)
      orbitdbA = await createOrbitDB({ ipfs: ipfsA, id: 'writerA', directory: './orbitdb-missed-a' })
      orbitdbB = await createOrbitDB({ ipfs: ipfsB, id: 'readerB', directory: './orbitdb-missed-b' })
      orbitdbR = await createOrbitDB({ ipfs: ipfsR, id: 'relayR', directory: './orbitdb-missed-r' })
    })

    after(async () => {
      await Promise.allSettled([orbitdbA, orbitdbB, orbitdbR].map((o) => o?.stop()))
      await Promise.allSettled([ipfsA, ipfsB, ipfsR].map((i) => i?.stop()))
      await rimraf('./orbitdb-missed-a')
      await rimraf('./orbitdb-missed-b')
      await rimraf('./orbitdb-missed-r')
    })

    it('receives an entry the relay learnt through the heads exchange', async () => {
      const dbA = await orbitdbA.open('sync-missed-relay', { type: 'keyvalue' })
      const address = dbA.address.toString()
      const dbR = await orbitdbR.open(address)
      const dbB = await orbitdbB.open(address)

      // Everyone subscribed and the relay has both peers in its mesh: all empty.
      const settled = await waitUntil(() => {
        const mesh = ipfsR.libp2p.services.pubsub.mesh?.get?.(address)
        return dbR.peers.size >= 2 && dbB.peers.size >= 1 && (mesh?.size ?? 0) >= 2
      })
      strictEqual(Boolean(settled), true, 'the star never settled')

      // The writer's first entry is published while nobody can hear it.
      await ipfsA.libp2p.hangUp(ipfsR.libp2p.peerId)
      await waitUntil(() => ipfsA.libp2p.getConnections(ipfsR.libp2p.peerId).length === 0)
      await dbA.put('k', 'first-entry')

      // Let the writer's gossip cache expire, so that reconnecting cannot hand
      // the entry over by IHAVE/IWANT. What is left is the heads exchange.
      await sleep(8000)

      await connectPeers(ipfsR, ipfsA)
      const relayHasIt = await waitUntil(async () => (await dbR.all()).length === 1)
      strictEqual(Boolean(relayHasIt), true, 'the relay never received the entry')

      // The relay learnt it by exchange. The reader must hear about it anyway.
      const readerHasIt = await waitUntil(async () => (await dbB.all()).length === 1, 10000)
      strictEqual(Boolean(readerHasIt), true, 'the reader never received the entry the relay holds')
    })
  })

  describe('a peer that was subscribed before the database opened', () => {
    let ipfs1, ipfs2
    let orbitdb1, orbitdb2
    let originalDialProtocol

    before(async () => {
      [ipfs1, ipfs2] = await Promise.all([createHelia(), createHelia()])
      await connectPeers(ipfs1, ipfs2)
      orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'owner1', directory: './orbitdb-missed-1' })
      orbitdb2 = await createOrbitDB({ ipfs: ipfs2, id: 'joiner2', directory: './orbitdb-missed-2' })
    })

    after(async () => {
      if (originalDialProtocol) ipfs1.libp2p.dialProtocol = originalDialProtocol
      await Promise.allSettled([orbitdb1, orbitdb2].map((o) => o?.stop()))
      await Promise.allSettled([ipfs1, ipfs2].map((i) => i?.stop()))
      await rimraf('./orbitdb-missed-1')
      await rimraf('./orbitdb-missed-2')
    })

    it('is exchanged with by the peer that opens the database', async () => {
      const db1 = await orbitdb1.open('sync-missed-preexisting', { type: 'keyvalue' })
      await db1.put('k', 'written-before-the-joiner-arrived')
      const address = db1.address.toString()

      // The joiner's pubsub already knows peer 1 is subscribed, so opening the
      // database brings it no subscription-change for peer 1.
      const known = await waitUntil(() =>
        ipfs2.libp2p.services.pubsub.getSubscribers(address).some((p) => p.equals(ipfs1.libp2p.peerId))
      )
      strictEqual(Boolean(known), true, 'the joiner never learnt that peer 1 is subscribed')

      // Peer 1 cannot start the exchange. Whatever goes wrong with that dial in
      // practice -- a limited connection, a handler not registered yet -- it is
      // not retried. The joiner has to start it.
      originalDialProtocol = ipfs1.libp2p.dialProtocol.bind(ipfs1.libp2p)
      ipfs1.libp2p.dialProtocol = async (peer, protocols, options) => {
        const list = Array.isArray(protocols) ? protocols : [protocols]
        if (list.some((p) => String(p).startsWith('/orbitdb/heads/'))) {
          throw new Error('heads dial blocked by the test')
        }
        return originalDialProtocol(peer, protocols, options)
      }
      db1.events.on('error', () => {})

      const db2 = await orbitdb2.open(address)
      const joinerHasIt = await waitUntil(async () => (await db2.all()).length === 1, 10000)
      strictEqual(Boolean(joinerHasIt), true, 'the joiner never received the existing entry')
    })
  })
})
