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

  describe('a slow dial to one peer', () => {
    let ipfs1, ipfs2, ipfs3
    let orbitdb1, orbitdb2, orbitdb3
    const restore = []

    before(async () => {
      [ipfs1, ipfs2, ipfs3] = await Promise.all([createHelia(), createHelia(), createHelia()])
      await connectPeers(ipfs1, ipfs2)
      await connectPeers(ipfs1, ipfs3)
      orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'owner-slow', directory: './orbitdb-missed-s1' })
      orbitdb2 = await createOrbitDB({ ipfs: ipfs2, id: 'joiner-slow', directory: './orbitdb-missed-s2' })
      orbitdb3 = await createOrbitDB({ ipfs: ipfs3, id: 'stalled-slow', directory: './orbitdb-missed-s3' })
    })

    after(async () => {
      for (const undo of restore) undo()
      await Promise.allSettled([orbitdb1, orbitdb2, orbitdb3].map((o) => o?.stop()))
      await Promise.allSettled([ipfs1, ipfs2, ipfs3].map((i) => i?.stop()))
      await rimraf('./orbitdb-missed-s1')
      await rimraf('./orbitdb-missed-s2')
      await rimraf('./orbitdb-missed-s3')
    })

    /**
     * Replace a node's heads dials. `decide(peer)` returns 'hang' (wait until
     * aborted, like a peer reachable only over a relayed connection), 'refuse'
     * or nothing for a normal dial.
     */
    const interceptHeadsDials = (ipfs, decide) => {
      const original = ipfs.libp2p.dialProtocol.bind(ipfs.libp2p)
      ipfs.libp2p.dialProtocol = async (peer, protocols, options) => {
        const list = Array.isArray(protocols) ? protocols : [protocols]
        if (list.some((p) => String(p).startsWith('/orbitdb/heads/'))) {
          const verdict = decide(peer)
          if (verdict === 'hang') {
            await new Promise((resolve, reject) => {
              options?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
            })
          }
          if (verdict === 'refuse') throw new Error('heads dial refused by the test')
        }
        return original(peer, protocols, options)
      }
      restore.push(() => { ipfs.libp2p.dialProtocol = original })
    }

    it('does not hold up the exchange with another peer', async () => {
      const db1 = await orbitdb1.open('sync-missed-slow-dial', { type: 'keyvalue' })
      db1.events.on('error', () => {})
      await db1.put('k', 'written-before-anyone-arrived')
      const address = db1.address.toString()

      // Peer 1 cannot reach peer 3 for heads: its dial hangs until the timeout.
      let stalled = false
      interceptHeadsDials(ipfs1, (peer) => {
        if (peer.equals?.(ipfs3.libp2p.peerId)) {
          stalled = true
          return 'hang'
        }
      })
      const db3 = await orbitdb3.open(address)
      db3.events.on('error', () => {})
      strictEqual(Boolean(await waitUntil(() => stalled)), true, 'peer 1 never dialled peer 3')

      // The joiner cannot start the exchange itself, so peer 1 has to -- while
      // its dial to peer 3 still hangs.
      interceptHeadsDials(ipfs2, () => 'refuse')
      const db2 = await orbitdb2.open(address)
      db2.events.on('error', () => {})

      const joinerHasIt = await waitUntil(async () => (await db2.all()).length === 1, 8000)
      strictEqual(Boolean(joinerHasIt), true, 'the hanging dial held up the exchange with the joiner')
    })
  })

  describe('peers first met over a connection the exchange cannot use', () => {
    let ipfs1, ipfs2
    let orbitdb1, orbitdb2
    const restore = []

    before(async () => {
      [ipfs1, ipfs2] = await Promise.all([createHelia(), createHelia()])
      await connectPeers(ipfs1, ipfs2)
      orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'owner-direct', directory: './orbitdb-missed-d1' })
      orbitdb2 = await createOrbitDB({ ipfs: ipfs2, id: 'joiner-direct', directory: './orbitdb-missed-d2' })
    })

    after(async () => {
      for (const undo of restore.splice(0)) undo()
      await Promise.allSettled([orbitdb1, orbitdb2].map((o) => o?.stop()))
      await Promise.allSettled([ipfs1, ipfs2].map((i) => i?.stop()))
      await rimraf('./orbitdb-missed-d1')
      await rimraf('./orbitdb-missed-d2')
    })

    afterEach(() => {
      for (const undo of restore.splice(0)) undo()
    })

    /**
     * Two peers a relay introduces see each other subscribe over the circuit
     * the relay carries, and the heads exchange cannot open a stream there.
     * Both nodes' heads dials behave like that while `path.limited` is set:
     * refused at once, or -- with `path.hang` -- held until `path.release()`,
     * like a dial that waits out its timeout. Clearing `path.limited` stands
     * for the direct connection that follows.
     */
    const onlyALimitedPath = ({ hang = false } = {}) => {
      let release
      const released = new Promise((resolve) => { release = resolve })
      const path = { limited: true, attempts: 0, inFlight: 0, release }
      for (const ipfs of [ipfs1, ipfs2]) {
        const original = ipfs.libp2p.dialProtocol.bind(ipfs.libp2p)
        ipfs.libp2p.dialProtocol = async (peer, protocols, options) => {
          const list = Array.isArray(protocols) ? protocols : [protocols]
          if (path.limited && list.some((p) => String(p).startsWith('/orbitdb/heads/'))) {
            path.attempts++
            if (hang) {
              path.inFlight++
              await released
            }
            const error = new Error('the only connection is limited')
            error.name = 'LimitedConnectionError'
            throw error
          }
          return original(peer, protocols, options)
        }
        restore.push(() => { ipfs.libp2p.dialProtocol = original })
      }
      return path
    }

    /** A second, unlimited connection from peer 2 to peer 1 -- the first stays open. */
    const openDirectConnection = async () => {
      const addrs = ipfs1.libp2p.getMultiaddrs()
      const addr = addrs.find((ma) => ma.toString().includes('/ip4/127.0.0.1/')) ?? addrs[0]
      const before = ipfs2.libp2p.getConnections(ipfs1.libp2p.peerId).length
      await ipfs2.libp2p.dial(addr, { force: true })
      strictEqual(ipfs2.libp2p.getConnections(ipfs1.libp2p.peerId).length, before + 1, 'no second connection was opened')
    }

    /** Peer 2 opens the database while peer 1's entry has left every gossip cache. */
    const joinAfterTheEntry = async (name) => {
      const db1 = await orbitdb1.open(name, { type: 'keyvalue' })
      db1.events.on('error', () => {})
      await db1.put('k', 'written-before-the-peers-met')
      // Long enough for gossip to forget the entry: only an exchange can deliver it.
      await sleep(8000)
      const db2 = await orbitdb2.open(db1.address.toString())
      db2.events.on('error', () => {})
      return { db1, db2 }
    }

    it('exchanges once an unlimited connection to the peer opens', async () => {
      const path = onlyALimitedPath()
      const { db1, db2 } = await joinAfterTheEntry('sync-missed-direct-later')
      const address = db1.address.toString()

      const subscribed = await waitUntil(() =>
        ipfs2.libp2p.services.pubsub.getSubscribers(address).some((p) => p.equals(ipfs1.libp2p.peerId)) &&
        ipfs1.libp2p.services.pubsub.getSubscribers(address).some((p) => p.equals(ipfs2.libp2p.peerId))
      )
      strictEqual(Boolean(subscribed), true, 'the peers never saw each other subscribe')
      strictEqual(Boolean(await waitUntil(() => path.attempts >= 2)), true, 'no exchange was attempted over the limited path')
      await sleep(1000)
      strictEqual((await db2.all()).length, 0, 'the entry arrived although no exchange could run')

      path.limited = false
      await openDirectConnection()

      const joinerHasIt = await waitUntil(async () => (await db2.all()).length === 1, 10000)
      strictEqual(Boolean(joinerHasIt), true, 'the entry never arrived over the direct connection')
    })

    it('tries again when the direct connection opens while the exchange is still failing', async () => {
      const path = onlyALimitedPath({ hang: true })
      const { db1, db2 } = await joinAfterTheEntry('sync-missed-direct-during')

      // Both sides' dials hang on the limited path.
      strictEqual(Boolean(await waitUntil(() => path.inFlight >= 2)), true, 'the exchanges were never started')

      // The direct connection opens while they hang; then they fail.
      path.limited = false
      await openDirectConnection()
      path.release()

      const joinerHasIt = await waitUntil(async () => (await db2.all()).length === 1, 10000)
      strictEqual(Boolean(joinerHasIt), true, 'the failed exchange was not tried again over the direct connection')
      strictEqual((await db1.all()).length, 1)
    })
  })
})
