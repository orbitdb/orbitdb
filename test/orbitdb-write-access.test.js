import { strictEqual, notStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import path from 'path'
import OrbitDB from '../src/orbitdb.js'
import waitFor from './utils/wait-for.js'
import connectPeers from './utils/connect-nodes.js'
import IPFSAccessController from '../src/access-controllers/ipfs.js'
import OrbitDBAccessController from '../src/access-controllers/orbitdb.js'
import createHelia from './utils/create-helia.js'

const dbPath = './orbitdb/tests/write-permissions'

describe('Write Permissions', function () {
  this.timeout(20000)

  let ipfs1, ipfs2
  let orbitdb1, orbitdb2
  let db1, db2

  before(async () => {
    [ipfs1, ipfs2] = await Promise.all([createHelia(), createHelia()])
    await connectPeers(ipfs1, ipfs2)

    orbitdb1 = await OrbitDB({ ipfs: ipfs1, id: 'user1', directory: path.join(dbPath, '1') })
    orbitdb2 = await OrbitDB({ ipfs: ipfs2, id: 'user2', directory: path.join(dbPath, '2') })
  })

  after(async () => {
    if (orbitdb1) {
      await orbitdb1.stop()
    }

    if (orbitdb2) {
      await orbitdb2.stop()
    }

    if (ipfs1) {
      await ipfs1.stop()
    }

    if (ipfs2) {
      await ipfs2.stop()
    }

    await rimraf('./orbitdb')
    await rimraf('./ipfs1')
    await rimraf('./ipfs2')
  })

  afterEach(async () => {
    await db1.drop()
    await db1.close()

    await db2.drop()
    await db2.close()
  })

  it('throws an error if another peer writes to a log with default write access', async () => {
    let err
    let connected = false

    const onConnected = async (peerId, heads) => {
      connected = true
    }

    db1 = await orbitdb1.open('write-test-1')
    db2 = await orbitdb2.open(db1.address)

    db2.events.on('join', onConnected)

    await waitFor(() => connected, () => true)

    await db1.add('record 1')

    try {
      await db2.add('record 2')
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, `Error: Could not append entry:\nKey "${db2.identity.hash}" is not allowed to write to the log`)
  })

  it('allows anyone to write to the log', async () => {
    let connected = false
    let updateCount = 0

    const onConnected = async (peerId, heads) => {
      connected = true
    }

    const onUpdate = async (entry) => {
      ++updateCount
    }

    db1 = await orbitdb1.open('write-test-2', { AccessController: IPFSAccessController({ write: ['*'] }) })
    db2 = await orbitdb2.open(db1.address)

    db2.events.on('join', onConnected)
    db2.events.on('update', onUpdate)

    await waitFor(() => connected, () => true)

    await db1.add('record 1')
    await db2.add('record 2')

    await waitFor(() => updateCount === 2, () => true)

    strictEqual((await db1.all()).length, (await db2.all()).length)
  })

  it('allows specific peers to write to the log', async () => {
    let connected = false
    let updateCount = 0

    const options = {
      AccessController: IPFSAccessController({
      // Set write access for both clients
        write: [
          orbitdb1.identity.id,
          orbitdb2.identity.id
        ]
      })
    }
    const onConnected = async (peerId, heads) => {
      connected = true
    }

    const onUpdate = async (entry) => {
      ++updateCount
    }

    db1 = await orbitdb1.open('write-test-3', options)
    db2 = await orbitdb2.open(db1.address)

    db2.events.on('join', onConnected)
    db2.events.on('update', onUpdate)

    await waitFor(() => connected, () => true)

    await db1.add('record 1')
    await db2.add('record 2')

    await waitFor(() => updateCount === 2, () => true)

    strictEqual((await db1.all()).length, (await db2.all()).length)
  })

  it('throws an error if peer does not have write access', async () => {
    let err
    let connected = false

    const options = {
      AccessController: IPFSAccessController({
        write: [
          orbitdb1.identity.id
        ]
      })
    }

    const onConnected = async (peerId, heads) => {
      connected = true
    }

    db1 = await orbitdb1.open('write-test-4', options)
    db2 = await orbitdb2.open(db1.address)

    db2.events.on('join', onConnected)

    await waitFor(() => connected, () => true)

    await db1.add('record 1')

    try {
      await db2.add('record 2')
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, `Error: Could not append entry:\nKey "${db2.identity.hash}" is not allowed to write to the log`)
  })

  it('uses an OrbitDB access controller to manage access - one writer', async () => {
    let connected = false
    let updateCount = 0

    const onConnected = async (peerId, heads) => {
      connected = true
    }

    const onUpdate = async (entry) => {
      ++updateCount
    }

    db1 = await orbitdb1.open('write-test-5', { AccessController: OrbitDBAccessController() })
    db2 = await orbitdb2.open(db1.address)

    db2.events.on('join', onConnected)
    db2.events.on('update', onUpdate)

    await waitFor(() => connected, () => true)

    await db1.add('record 1')

    let err

    try {
      await db2.add('record 2')
    } catch (e) {
      err = e
    }

    await waitFor(() => updateCount === 1, () => true)

    strictEqual((await db1.all()).length, (await db2.all()).length)

    notStrictEqual(err, undefined)
    strictEqual(err.toString().endsWith('is not allowed to write to the log'), true)
  })

  it('uses an OrbitDB access controller to manage access - two writers', async () => {
    let connected = false
    let updateCount = 0
    let accessUpdated = false

    const onConnected = async (peerId, heads) => {
      connected = true
    }

    const onUpdate = async (entry) => {
      ++updateCount
    }

    const onAccessUpdated = async (entry) => {
      accessUpdated = true
    }

    db1 = await orbitdb1.open('write-test', { AccessController: OrbitDBAccessController() })
    db2 = await orbitdb2.open(db1.address)

    db2.events.on('join', onConnected)
    db2.events.on('update', onUpdate)

    await waitFor(() => connected, () => true)

    db2.access.events.on('update', onAccessUpdated)

    await db1.access.grant('write', db2.identity.id)

    await waitFor(() => accessUpdated, () => true)

    await db1.add('record 1')
    await db2.add('record 2')

    await waitFor(() => updateCount === 2, () => true)

    strictEqual((await db1.all()).length, (await db2.all()).length)
  })

  it('OrbitDB access controller address is deterministic', async () => {
    let connected = false
    let updateCount = 0
    let closed = false

    const onConnected = async (peerId, heads) => {
      connected = true
    }

    const onUpdate = async (entry) => {
      ++updateCount
    }

    const onClose = async () => {
      closed = true
    }

    const dbName = 'write-test-7'

    db1 = await orbitdb1.open(dbName, { AccessController: OrbitDBAccessController() })
    db2 = await orbitdb2.open(db1.address)

    const addr = db1.address

    db2.events.on('join', onConnected)
    db2.events.on('update', onUpdate)
    db2.events.on('close', onClose)

    await waitFor(() => connected, () => true)

    await db1.add('record 1')

    await waitFor(() => updateCount === 1, () => true)

    strictEqual((await db1.all()).length, (await db2.all()).length)

    await db1.close()
    await db2.close()

    await waitFor(() => closed, () => true)

    db1 = await orbitdb1.open(dbName, { AccessController: OrbitDBAccessController() })
    db2 = await orbitdb2.open(db1.address)

    strictEqual(db1.address, addr)
  })
})
