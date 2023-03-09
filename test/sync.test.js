import { deepStrictEqual, strictEqual, notStrictEqual } from 'assert'
import rmrf from 'rimraf'
import { copy } from 'fs-extra'
import * as IPFS from 'ipfs'
import Sync from '../src/sync.js'
import { Log, Entry, Identities, KeyStore } from '../src/index.js'
import config from './config.js'
import connectPeers from './utils/connect-nodes.js'
import waitFor from './utils/wait-for.js'
import testKeysPath from './fixtures/test-keys-path.js '

const keysPath = './testkeys'

describe('Sync protocol', function () {
  this.timeout(5000)

  let ipfs1, ipfs2
  let keystore
  let identities
  let testIdentity1, testIdentity2
  let peerId1, peerId2

  before(async () => {
    await rmrf('./ipfs1')
    await rmrf('./ipfs2')

    ipfs1 = await IPFS.create({ ...config.daemon1, repo: './ipfs1' })
    ipfs2 = await IPFS.create({ ...config.daemon2, repo: './ipfs2' })

    peerId1 = (await ipfs1.id()).id
    peerId2 = (await ipfs2.id()).id

    await connectPeers(ipfs1, ipfs2)

    await copy(testKeysPath, keysPath)
    keystore = await KeyStore({ path: keysPath })
    identities = await Identities({ keystore })
    testIdentity1 = await identities.createIdentity({ id: 'userA' })
    testIdentity2 = await identities.createIdentity({ id: 'userB' })
  })

  after(async () => {
    await ipfs1.stop()
    await ipfs2.stop()
    await rmrf('./ipfs1')
    await rmrf('./ipfs2')
    if (keystore) {
      await keystore.close()
    }
    await rmrf(keysPath)
  })

  describe('Creating an instance', () => {
    let sync

    before(async () => {
      const log = await Log(testIdentity1)
      sync = await Sync({ ipfs: ipfs1, log })
    })

    after(async () => {
      if (sync) {
        await sync.stop()
      }
    })

    it('creates an instance', async () => {
      notStrictEqual(sync, undefined)
    })

    it('has an ad function', async () => {
      notStrictEqual(sync.add, undefined)
      strictEqual(typeof sync.add, 'function')
    })

    it('has a start function', async () => {
      notStrictEqual(sync.start, undefined)
      strictEqual(typeof sync.stop, 'function')
    })

    it('has a stop function', async () => {
      notStrictEqual(sync.stop, undefined)
      strictEqual(typeof sync.stop, 'function')
    })

    it('has events', async () => {
      notStrictEqual(sync.events, undefined)
    })

    it('has a set of peers', async () => {
      notStrictEqual(sync.peers, undefined)
      strictEqual(sync.peers instanceof Set, true)
    })
  })

  describe('Syncing automatically', () => {
    let sync1, sync2
    let joinEventFired = false
    let syncedEventFired = false
    let syncedHead
    let expectedEntry

    before(async () => {
      const log1 = await Log(testIdentity1, { logId: 'synclog1' })
      const log2 = await Log(testIdentity2, { logId: 'synclog1' })

      const onSynced = async (bytes) => {
        syncedHead = await Entry.decode(bytes)
        syncedEventFired = true
      }

      const onJoin = async (peerId, heads) => {
        joinEventFired = true
      }

      expectedEntry = await log1.append('hello1')

      sync1 = await Sync({ ipfs: ipfs1, log: log1, onSynced: () => {} })
      sync2 = await Sync({ ipfs: ipfs2, log: log2, onSynced })
      sync1.events.on('join', onJoin)

      await waitFor(() => joinEventFired, () => true)
      await waitFor(() => syncedEventFired, () => true)
    })

    after(async () => {
      if (sync1) {
        await sync1.stop()
      }
      if (sync2) {
        await sync2.stop()
      }
    })

    it('syncs the head', async () => {
      deepStrictEqual(syncedHead, expectedEntry)
    })

    it('updates the set of connected peers', async () => {
      strictEqual(sync2.peers.has(String(peerId1)), true)
      strictEqual(sync1.peers.has(String(peerId2)), true)
    })
  })

  describe('Starting sync manually', () => {
    let sync1, sync2
    let syncedEventFired = false
    let syncedHead
    let expectedEntry

    before(async () => {
      const log1 = await Log(testIdentity1, { logId: 'synclog1' })
      const log2 = await Log(testIdentity2, { logId: 'synclog1' })

      const onSynced = async (bytes) => {
        syncedHead = await Entry.decode(bytes)
        syncedEventFired = true
      }

      sync1 = await Sync({ ipfs: ipfs1, log: log1 })
      sync2 = await Sync({ ipfs: ipfs2, log: log2, onSynced, start: false })

      await log1.append('hello1')
      await log1.append('hello2')
      await log1.append('hello3')
      await log1.append('hello4')
      expectedEntry = await log1.append('hello5')
    })

    after(async () => {
      if (sync1) {
        await sync1.stop()
      }
      if (sync2) {
        await sync2.stop()
      }
    })

    it('starts syncing', async () => {
      await sync2.start()

      await waitFor(() => syncedEventFired, () => true)

      strictEqual(syncedEventFired, true)
    })

    it('syncs the correct head', async () => {
      deepStrictEqual(syncedHead, expectedEntry)
    })

    it('updates the set of connected peers', async () => {
      strictEqual(sync2.peers.has(String(peerId1)), true)
      strictEqual(sync1.peers.has(String(peerId2)), true)
    })
  })

  describe('Stopping sync', () => {
    let sync1, sync2
    let log1, log2
    let syncedEventFired = false
    let leaveEventFired = false
    let syncedHead
    let expectedEntry
    let leavingPeerId

    before(async () => {
      log1 = await Log(testIdentity1, { logId: 'synclog1' })
      log2 = await Log(testIdentity2, { logId: 'synclog1' })

      const onSynced = async (bytes) => {
        syncedHead = await Entry.decode(bytes)
        syncedEventFired = true
      }

      const onLeave = async (peerId) => {
        leaveEventFired = true
        leavingPeerId = peerId
      }

      sync1 = await Sync({ ipfs: ipfs1, log: log1 })
      sync2 = await Sync({ ipfs: ipfs2, log: log2, onSynced })

      sync2.events.on('leave', onLeave)

      await log1.append('hello1')
      await log1.append('hello2')
      await log1.append('hello3')
      await log1.append('hello4')
      expectedEntry = await log1.append('hello5')
    })

    after(async () => {
      if (sync1) {
        await sync1.stop()
      }
      if (sync2) {
        await sync2.stop()
      }
    })

    it('starts syncing', async () => {
      await waitFor(() => syncedEventFired, () => true)

      strictEqual(syncedEventFired, true)
      deepStrictEqual(syncedHead, expectedEntry)

      strictEqual(sync1.peers.has(String(peerId2)), true)
      strictEqual(sync2.peers.has(String(peerId1)), true)
    })

    it('stops syncing', async () => {
      await sync1.stop()

      await log1.append('hello6')
      await log1.append('hello7')
      await log1.append('hello8')
      await log1.append('hello9')
      await log1.append('hello10')

      await waitFor(() => leaveEventFired, () => true)

      deepStrictEqual(syncedHead, expectedEntry)
    })

    it('the peerId passed by the \'leave\' event is the expected peer ID', async () => {
      strictEqual(String(leavingPeerId), String(peerId1))
    })

    it('updates the set of connected peers', async () => {
      strictEqual(sync2.peers.has(String(leavingPeerId)), false)
      strictEqual(sync1.peers.has(String(peerId2)), false)
    })
  })

  describe('Restarting sync after stopping it manually', () => {
    let sync1, sync2
    let log1, log2
    let syncedEventFired = false
    let leaveEventFired = false
    let syncedHead
    let expectedEntry, expectedEntry2

    before(async () => {
      log1 = await Log(testIdentity1, { logId: 'synclog1' })
      log2 = await Log(testIdentity2, { logId: 'synclog1' })

      const onSynced = async (bytes) => {
        syncedHead = await Entry.decode(bytes)
        syncedEventFired = true
      }

      const onLeave = async (peerId) => {
        leaveEventFired = true
      }

      sync1 = await Sync({ ipfs: ipfs1, log: log1 })
      sync2 = await Sync({ ipfs: ipfs2, log: log2, onSynced })

      sync2.events.on('leave', onLeave)

      await log1.append('hello1')
      await log1.append('hello2')
      await log1.append('hello3')
      await log1.append('hello4')
      expectedEntry = await log1.append('hello5')

      await waitFor(() => syncedEventFired, () => true)

      strictEqual(syncedEventFired, true)
      deepStrictEqual(syncedHead, expectedEntry)

      await sync1.stop()

      await waitFor(() => leaveEventFired, () => true)

      strictEqual(leaveEventFired, true)
    })

    after(async () => {
      if (sync1) {
        await sync1.stop()
      }
      if (sync2) {
        await sync2.stop()
      }
    })

    it('restarts syncing', async () => {
      await log1.append('hello6')
      await log1.append('hello7')
      await log1.append('hello8')
      await log1.append('hello9')
      expectedEntry2 = await log1.append('hello10')

      syncedEventFired = false

      await sync1.start()

      await waitFor(() => syncedEventFired, () => true)

      strictEqual(syncedEventFired, true)
      deepStrictEqual(syncedHead, expectedEntry2)
    })

    it('updates the set of connected peers', async () => {
      strictEqual(sync1.peers.has(String(peerId2)), true)
      strictEqual(sync2.peers.has(String(peerId1)), true)
    })
  })

  describe('Syncing after initial sync', () => {
    let sync1, sync2
    let log1, log2
    let syncedEventFired = false
    let syncedHead
    let expectedEntry

    before(async () => {
      log1 = await Log(testIdentity1, { logId: 'synclog1' })
      log2 = await Log(testIdentity2, { logId: 'synclog1' })

      const onSynced = async (bytes) => {
        syncedHead = await Entry.decode(bytes)
        syncedEventFired = true
      }

      sync1 = await Sync({ ipfs: ipfs1, log: log1 })
      sync2 = await Sync({ ipfs: ipfs2, log: log2, onSynced })

      await log1.append('hello1')
      await log1.append('hello2')
      await log1.append('hello3')
      await log1.append('hello4')
      expectedEntry = await log1.append('hello5')

      await waitFor(() => syncedEventFired, () => true)

      strictEqual(syncedEventFired, true)
      deepStrictEqual(syncedHead, expectedEntry)
    })

    after(async () => {
      if (sync1) {
        await sync1.stop()
      }
      if (sync2) {
        await sync2.stop()
      }
    })

    it('doesn\'t sync when an entry is added to a log', async () => {
      await log1.append('hello6')
      deepStrictEqual(syncedHead, expectedEntry)
    })

    it('syncs new entries', async () => {
      syncedEventFired = false
      await log1.append('hello7')
      await log1.append('hello8')
      await log1.append('hello9')
      const expectedEntry2 = await log1.append('hello10')
      await sync1.add(expectedEntry2)
      await waitFor(() => syncedEventFired, () => true)
      deepStrictEqual(syncedHead, expectedEntry2)
    })
  })

  describe('Events', () => {
    let sync1, sync2
    let joinEventFired = false
    let leaveEventFired = false
    let receivedHeads = []
    let joiningPeerId
    let leavingPeerId

    before(async () => {
      const log1 = await Log(testIdentity1, { logId: 'synclog2' })
      const log2 = await Log(testIdentity2, { logId: 'synclog2' })

      const onJoin = async (peerId, heads) => {
        joinEventFired = true
        joiningPeerId = peerId
        receivedHeads = heads
      }

      const onLeave = async (peerId) => {
        leaveEventFired = true
        leavingPeerId = peerId
      }

      await log1.append('hello!')

      sync1 = await Sync({ ipfs: ipfs1, log: log1 })
      sync2 = await Sync({ ipfs: ipfs2, log: log2 })
      sync1.events.on('join', onJoin)
      sync1.events.on('leave', onLeave)

      await waitFor(() => joinEventFired, () => true)

      await sync2.stop()

      await waitFor(() => leaveEventFired, () => true)
    })

    after(async () => {
      if (sync1) {
        await sync1.stop()
      }
      if (sync2) {
        await sync2.stop()
      }
    })

    it('emits \'join\' event when a peer starts syncing', async () => {
      strictEqual(joinEventFired, true)
    })

    it('heads passed by the \'join\' event are the expected heads', async () => {
      strictEqual(receivedHeads.length, 1)
      strictEqual(receivedHeads[0].payload, 'hello!')
    })

    it('the peerId passed by the \'join\' event is the expected peer ID', async () => {
      const { id } = await ipfs2.id()
      strictEqual(String(joiningPeerId), String(id))
    })

    it('the peerId passed by the \'leave\' event is the expected peer ID', async () => {
      const { id } = await ipfs2.id()
      strictEqual(String(leavingPeerId), String(id))
    })

    it.skip('emits an \'error\' event', async () => {
      // TODO
    })
  })
})
