import { strictEqual } from 'assert'
import rmrf from 'rimraf'
import path from 'path'
import * as IPFS from 'ipfs'
import OrbitDB from '../src/OrbitDB.js'
import config from './config.js'
import waitFor from './utils/wait-for.js'
import connectPeers from './utils/connect-nodes.js'

const dbPath = './orbitdb/tests/write-permissions'

describe('Write Permissions', function () {
  this.timeout(20000)

  let ipfs1, ipfs2
  let orbitdb1, orbitdb2

  before(async () => {
    ipfs1 = await IPFS.create({ ...config.daemon1, repo: './ipfs1' })
    ipfs2 = await IPFS.create({ ...config.daemon2, repo: './ipfs2' })
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

    await rmrf('./orbitdb')
    await rmrf('./ipfs1')
    await rmrf('./ipfs2')
  })

  it('throws an error if a peer writes to a log with default write access', async () => {
    let err
    let connected = false

    const onConnected = async (peerId, heads) => {
      connected = true
    }

    const db1 = await orbitdb1.open('write-test')
    const db2 = await orbitdb2.open(db1.address)

    db2.events.on('join', onConnected)

    await waitFor(() => connected, () => true)

    await db1.add('record 1')

    try {
      await db2.add('record 2')
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, `Error: Could not append entry:\nKey "${db2.identity.hash}" is not allowed to write to the log`)

    await db1.close()
    await db2.close()
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

    const db1 = await orbitdb1.open('write-test', { write: ['*'] })
    const db2 = await orbitdb2.open(db1.address)

    db2.events.on('join', onConnected)
    db2.events.on('update', onUpdate)

    await waitFor(() => connected, () => true)

    await db1.add('record 1')
    await db2.add('record 2')

    await waitFor(() => updateCount === 2, () => true)

    strictEqual((await db1.all()).length, (await db2.all()).length)

    await db1.close()
    await db2.close()
  })

  it('allows specific peers to write to the log', async () => {
    let connected = false
    let updateCount = 0

    const options = {
    // Set write access for both clients
      write: [
        orbitdb1.identity.id,
        orbitdb2.identity.id
      ]
    }

    const onConnected = async (peerId, heads) => {
      connected = true
    }

    const onUpdate = async (entry) => {
      ++updateCount
    }

    const db1 = await orbitdb1.open('write-test', options)
    const db2 = await orbitdb2.open(db1.address)

    db2.events.on('join', onConnected)
    db2.events.on('update', onUpdate)

    await waitFor(() => connected, () => true)

    await db1.add('record 1')
    await db2.add('record 2')

    await waitFor(() => updateCount === 2, () => true)

    strictEqual((await db1.all()).length, (await db2.all()).length)

    await db1.close()
    await db2.close()
  })

  it('throws an error if peer does not have write access', async () => {
    let err
    let connected = false

    const options = {
      write: [
        orbitdb1.identity.id
      ]
    }

    const onConnected = async (peerId, heads) => {
      connected = true
    }

    const db1 = await orbitdb1.open('write-test', options)
    const db2 = await orbitdb2.open(db1.address)

    db2.events.on('join', onConnected)

    await waitFor(() => connected, () => true)

    await db1.add('record 1')

    try {
      await db2.add('record 2')
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, `Error: Could not append entry:\nKey "${db2.identity.hash}" is not allowed to write to the log`)

    await db1.close()
    await db2.close()
  })
})
