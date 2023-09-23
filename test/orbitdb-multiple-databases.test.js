import { strictEqual } from 'assert'
// import mapSeries from 'p-each-series'
import { rimraf } from 'rimraf'
import OrbitDB from '../src/orbitdb.js'
import connectPeers from './utils/connect-nodes.js'
import waitFor from './utils/wait-for.js'
import createHelia from './utils/create-helia.js'

const dbPath1 = './orbitdb/tests/multiple-databases/1'
const dbPath2 = './orbitdb/tests/multiple-databases/2'

const databaseInterfaces = [
  {
    name: 'events',
    open: async (orbitdb, address, options) => await orbitdb.open(address, options),
    write: async (db, index) => {
      await db.add('hello' + index)
    },
    query: async (db) => {
      const all = await db.all()
      return all.length
    }
  },
  {
    name: 'key-value',
    open: async (orbitdb, address, options) => await orbitdb.open(address, { ...options, type: 'keyvalue' }),
    write: async (db, index) => await db.put('hello', index),
    query: async (db) => await db.get('hello')
  },
  {
    name: 'documents',
    open: async (orbitdb, address, options) => await orbitdb.open(address, { ...options, type: 'documents' }),
    write: async (db, index) => await db.put({ _id: 'hello', testing: index }),
    query: async (db) => {
      const doc = await db.get('hello')
      return doc ? doc.value.testing : 0
    }
  }
]

describe('orbitdb - Multiple Databases', function () {
  this.timeout(30000)

  let ipfs1, ipfs2
  let orbitdb1, orbitdb2

  const localDatabases = []
  const remoteDatabases = []

  // Create two IPFS instances and two OrbitDB instances (2 nodes/peers)
  before(async () => {
    [ipfs1, ipfs2] = await Promise.all([createHelia(), createHelia()])
    await connectPeers(ipfs1, ipfs2)
    console.log('Peers connected')
    orbitdb1 = await OrbitDB({ ipfs: ipfs1, id: 'user1', directory: dbPath1 })
    orbitdb2 = await OrbitDB({ ipfs: ipfs2, id: 'user2', directory: dbPath2 })
  })

  after(async () => {
    if (orbitdb1) {
      await orbitdb1.stop()
    }
    if (orbitdb2) {
      await orbitdb2.stop()
    }

    await rimraf('./orbitdb')

    if (ipfs1) {
      await ipfs1.stop()
    }
    if (ipfs2) {
      await ipfs2.stop()
    }

    await rimraf('./ipfs1')
    await rimraf('./ipfs2')
  })

  beforeEach(async () => {
    let options = {}
    // Set write access for both clients
    options.write = [
      orbitdb1.identity.id,
      orbitdb2.identity.id
    ]

    let connected1Count = 0
    let connected2Count = 0

    const onConnected1 = async (peerId, heads) => {
      ++connected1Count
    }

    const onConnected2 = async (peerId, heads) => {
      ++connected2Count
    }

    console.log('Creating databases and waiting for peers to connect')

    // Open the databases on the first node
    options = Object.assign({}, options, { create: true })

    // Open the databases on the first node
    for (const dbInterface of databaseInterfaces) {
      const db = await dbInterface.open(orbitdb1, dbInterface.name, options)
      db.events.on('join', onConnected1)
      localDatabases.push(db)
    }

    for (const [index, dbInterface] of databaseInterfaces.entries()) {
      const address = localDatabases[index].address.toString()
      const db = await dbInterface.open(orbitdb2, address, options)
      db.events.on('join', onConnected2)
      remoteDatabases.push(db)
    }

    // Wait for the peers to connect
    await waitFor(() => connected1Count === 3, () => true)
    await waitFor(() => connected2Count === 3, () => true)

    console.log('Peers connected')
  })

  afterEach(async () => {
    for (const db of remoteDatabases) {
      await db.drop()
      await db.close()
    }

    for (const db of localDatabases) {
      await db.drop()
      await db.close()
    }
  })

  it('replicates multiple open databases', async () => {
    const entryCount = 10

    // Write entries to each database
    console.log('Writing to databases')
    for (let index = 0; index < databaseInterfaces.length; index++) {
      const dbInterface = databaseInterfaces[index]
      const db = localDatabases[index]

      // Create an array that we use to create the db entries
      for (let i = 1; i < entryCount + 1; i++) {
        await dbInterface.write(db, i)
      }
    }

    const isReplicated = async (db) => {
      const all = await db.log.all()
      return all.length === entryCount
    }

    // Function to check if all databases have been replicated
    const allReplicated = async () => {
      for (const db of remoteDatabases) {
        const replicated = await isReplicated(db)
        if (!replicated) {
          return false
        }
      }
      return true
    }

    console.log('Waiting for replication to finish')

    await waitFor(async () => await allReplicated(), () => true, 2000)

    console.log('Replication finished')

    for (let i = 0; i < databaseInterfaces.length; i++) {
      const db = remoteDatabases[i]
      const result = await databaseInterfaces[i].query(db)
      strictEqual(result, entryCount)
      strictEqual((await db.log.all()).length, entryCount)
    }
  })
})
