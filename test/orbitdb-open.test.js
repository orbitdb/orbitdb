import { deepStrictEqual, strictEqual, notStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import fs from 'fs'
import path from 'path'
import { createOrbitDB, isValidAddress } from '../src/index.js'
import KeyValueIndexed from '../src/databases/keyvalue-indexed.js'
import connectPeers from './utils/connect-nodes.js'
import waitFor from './utils/wait-for.js'
import createHelia from './utils/create-helia.js'

describe('Open databases', function () {
  this.timeout(5000)

  let ipfs1, ipfs2
  let orbitdb1, orbitdb2

  before(async () => {
    [ipfs1, ipfs2] = await Promise.all([createHelia(), createHelia()])
    await connectPeers(ipfs1, ipfs2)
  })

  after(async () => {
    if (ipfs1) {
      await ipfs1.stop()
    }
    if (ipfs2) {
      await ipfs2.stop()
    }
    await rimraf('./orbitdb1')
    await rimraf('./orbitdb2')
    await rimraf('./ipfs1')
    await rimraf('./ipfs2')
  })

  describe('creating a database instance', () => {
    let db

    before(async () => {
      orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'user1', directory: './orbitdb1' })
      db = await orbitdb1.open('helloworld')
    })

    after(async () => {
      if (db) {
        await db.drop()
        await db.close()
      }
      if (orbitdb1) {
        await orbitdb1.stop()
      }
      await rimraf('./orbitdb1')
    })

    it('creates a database instance', async () => {
      notStrictEqual(db, undefined)
    })

    it('has an address', async () => {
      notStrictEqual(db.address, undefined)
    })

    it('has a valid OrbitDB address', async () => {
      strictEqual(isValidAddress(db.address), true)
    })

    it('has a name', async () => {
      strictEqual(db.name, 'helloworld')
    })

    it('has an identity', async () => {
      notStrictEqual(db.identity, undefined)
    })

    it('has a close function', async () => {
      notStrictEqual(db.close, undefined)
      strictEqual(typeof db.close, 'function')
    })

    it('has a drop function', async () => {
      notStrictEqual(db.drop, undefined)
      strictEqual(typeof db.drop, 'function')
    })

    it('has a addOperation function', async () => {
      notStrictEqual(db.addOperation, undefined)
      strictEqual(typeof db.addOperation, 'function')
    })

    it('has a log', async () => {
      notStrictEqual(db.log, undefined)
    })

    it('has a log where the logId matches the databaseId', async () => {
      strictEqual(db.log.id, db.address.toString())
    })

    it('has a events emitter', async () => {
      notStrictEqual(db.events, undefined)
    })

    it('has a type', async () => {
      notStrictEqual(db.type, undefined)
    })

    it('has a type that equals the database type', async () => {
      strictEqual(db.type, 'events')
    })

    it('has a add function', async () => {
      notStrictEqual(db.add, undefined)
      strictEqual(typeof db.add, 'function')
    })

    it('has a get function', async () => {
      notStrictEqual(db.get, undefined)
      strictEqual(typeof db.get, 'function')
    })

    it('has an iterator function', async () => {
      notStrictEqual(db.iterator, undefined)
      strictEqual(typeof db.iterator, 'function')
    })

    it('has an all function', async () => {
      notStrictEqual(db.all, undefined)
      strictEqual(typeof db.all, 'function')
    })

    it('has a meta object', async () => {
      notStrictEqual(db.meta, undefined)
      strictEqual(typeof db.meta, 'object')
    })

    it('creates a directory for the database oplog', async () => {
      const expectedPath = path.join(orbitdb1.directory, `./${db.address}`, '/log/_heads')
      const directoryExists = fs.existsSync(expectedPath)
      strictEqual(directoryExists, true)
    })
  })

  describe('creating a database with meta info in the manifest', () => {
    let db
    const expected = { hello: 'world' }

    before(async () => {
      orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'user1', directory: './orbitdb1' })
      db = await orbitdb1.open('helloworld', { meta: expected })
    })

    after(async () => {
      if (db) {
        await db.drop()
        await db.close()
      }
      if (orbitdb1) {
        await orbitdb1.stop()
      }
      await rimraf('./orbitdb1')
    })

    it('contains the given meta info', async () => {
      deepStrictEqual(db.meta, expected)
    })
  })

  describe('opening a database', () => {
    let db

    const amount = 10

    before(async () => {
      orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'user1' })
      db = await orbitdb1.open('helloworld')

      for (let i = 0; i < amount; i++) {
        await db.add('hello' + i)
      }

      await db.close()
    })

    after(async () => {
      if (db) {
        await db.close()
      }
      if (orbitdb1) {
        await orbitdb1.stop()
      }
      await rimraf('./orbitdb')
    })

    it('returns all entries in the database', async () => {
      db = await orbitdb1.open('helloworld')

      strictEqual(db.type, 'events')
      strictEqual(db.name, 'helloworld')

      const expected = []
      for (let i = 0; i < amount; i++) {
        expected.push('hello' + i)
      }

      const all = []
      for await (const event of db.iterator()) {
        all.unshift(event)
      }

      deepStrictEqual(all.map(e => e.value), expected)
    })

    it('re-opens a database by address', async () => {
      const dbReopened = await orbitdb1.open(db.address)

      strictEqual(dbReopened.address, db.address)

      dbReopened.close()
    })
  })

  describe('opening a database as a different user', () => {
    let db, address

    const amount = 10

    before(async () => {
      orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'user1' })
      db = await orbitdb1.open('helloworld2')

      for (let i = 0; i < amount; i++) {
        await db.add('hello' + i)
      }

      address = db.address

      await db.close()
      await orbitdb1.stop()

      orbitdb2 = await createOrbitDB({ ipfs: ipfs2, id: 'user2' })
    })

    after(async () => {
      if (db) {
        await db.close()
      }
      if (orbitdb2) {
        await orbitdb2.stop()
      }
      await rimraf('./orbitdb')
    })

    it('returns all entries in the database', async () => {
      db = await orbitdb2.open(address)

      strictEqual(db.type, 'events')
      strictEqual(db.name, 'helloworld2')

      const expected = []
      for (let i = 0; i < amount; i++) {
        expected.push('hello' + i)
      }

      const all = []
      for await (const event of db.iterator()) {
        all.unshift(event)
      }

      deepStrictEqual(all.map(e => e.value), expected)
    })
  })

  describe('opening a replicated database', () => {
    let db1, db2
    let address

    const amount = 10

    before(async () => {
      orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'user1', directory: './orbitdb1' })
      orbitdb2 = await createOrbitDB({ ipfs: ipfs2, id: 'user2', directory: './orbitdb2' })
      db1 = await orbitdb1.open('helloworld2')
      for (let i = 0; i < amount; i++) {
        await db1.add('hello' + i)
      }
      address = db1.address
    })

    after(async () => {
      if (db1) {
        await db1.close()
      }
      if (db2) {
        await db2.close()
      }
      if (orbitdb1) {
        await orbitdb1.stop()
      }
      if (orbitdb2) {
        await orbitdb2.stop()
      }
      await rimraf('./orbitdb1')
      await rimraf('./orbitdb2')
    })

    it('replicates the database', async () => {
      console.time('replicate')
      let updateCount = 0
      let connected = false

      const onError = (err) => {
        console.error(err)
      }

      const onConnected = async (peerId, heads) => {
        connected = true
      }

      const onUpdate = (entry) => {
        ++updateCount
      }

      db2 = await orbitdb2.open(address)

      db2.events.on('error', onError)
      db2.events.on('update', onUpdate)
      db2.events.on('join', onConnected)

      await waitFor(() => connected, () => true)
      await waitFor(() => updateCount > 0, () => true)

      const expected = []
      for (let i = 0; i < amount; i++) {
        expected.push('hello' + i)
      }

      const all = []
      for await (const event of db2.iterator()) {
        all.unshift(event)
      }
      console.timeEnd('replicate')

      deepStrictEqual(all.map(e => e.value), expected)
    })

    it('opens the replicated database', async () => {
      if (db1) {
        await db1.drop()
        await db1.close()
        db1 = null
      }
      if (db2) {
        await db2.close()
      }
      if (orbitdb1) {
        await orbitdb1.stop()
        orbitdb1 = null
      }

      db2 = await orbitdb2.open(address)

      const expected = []
      for (let i = 0; i < amount; i++) {
        expected.push('hello' + i)
      }

      const all = []
      for await (const event of db2.iterator()) {
        all.unshift(event)
      }

      deepStrictEqual(all.map(e => e.value), expected)
    })
  })

  describe('opening a keyvalue database', () => {
    let db, address

    const amount = 10

    before(async () => {
      orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'user1' })
      db = await orbitdb1.open('helloworld', { type: 'keyvalue' })
      address = db.address

      for (let i = 0; i < amount; i++) {
        await db.put('key' + i, 'hello' + i)
      }

      await db.close()
    })

    after(async () => {
      if (db) {
        await db.close()
      }
      if (orbitdb1) {
        await orbitdb1.stop()
      }
      await rimraf('./orbitdb')
    })

    it('returns all entries in the database', async () => {
      db = await orbitdb1.open(address)

      strictEqual(db.type, 'keyvalue')
      strictEqual(db.name, 'helloworld')

      const expected = []
      for (let i = 0; i < amount; i++) {
        expected.push({ key: 'key' + i, value: 'hello' + i })
      }

      const all = []
      for await (const { key, value } of db.iterator()) {
        all.unshift({ key, value })
      }

      deepStrictEqual(all, expected)
    })
  })

  describe('opening an indexed keyvalue database', () => {
    let db, address

    const amount = 10

    before(async () => {
      orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'user1' })
      db = await orbitdb1.open('helloworld', { Database: KeyValueIndexed() })
      address = db.address

      for (let i = 0; i < amount; i++) {
        await db.put('key' + i, 'hello' + i)
      }

      await db.close()
    })

    after(async () => {
      if (db) {
        await db.close()
      }
      if (orbitdb1) {
        await orbitdb1.stop()
      }
      await rimraf('./index')
      await rimraf('./orbitdb')
    })

    it('returns all entries in the database and in the index', async () => {
      db = await orbitdb1.open(address, { Database: KeyValueIndexed() })

      strictEqual(db.address, address)
      strictEqual(db.type, 'keyvalue')
      strictEqual(db.name, 'helloworld')

      const expected = []
      for (let i = 0; i < amount; i++) {
        expected.push({ key: 'key' + i, value: 'hello' + i })
      }

      const result = []
      for await (const { key, value } of db.iterator()) {
        result.unshift({ key, value })
      }

      deepStrictEqual(result, expected)
    })
  })

  describe('opening an documents database', () => {
    let db, address

    const amount = 10

    before(async () => {
      orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'user1' })
      db = await orbitdb1.open('helloworld', { type: 'documents' })
      address = db.address

      for (let i = 0; i < amount; i++) {
        await db.put({ _id: 'hello' + i, msg: 'hello' + i })
      }

      await db.close()
    })

    after(async () => {
      if (db) {
        await db.close()
      }
      if (orbitdb1) {
        await orbitdb1.stop()
      }
      await rimraf('./orbitdb')
    })

    it('returns all entries in the database', async () => {
      db = await orbitdb1.open(address)

      strictEqual(db.type, 'documents')
      strictEqual(db.name, 'helloworld')

      const expected = []
      for (let i = 0; i < amount; i++) {
        expected.push({ _id: 'hello' + i, msg: 'hello' + i })
      }

      const all = []
      for await (const doc of db.iterator()) {
        all.unshift(doc)
      }

      deepStrictEqual(all.map(e => e.value), expected)
    })
  })

  describe('opening same database', () => {
    let db1, db2

    before(async () => {
      orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'user1' })
    })

    after(async () => {
      if (db1) {
        await db1.close()
      }
      if (db2) {
        await db2.close()
      }
      if (orbitdb1) {
        await orbitdb1.stop()
      }
      await rimraf('./orbitdb')
    })

    it('returns the database instance when opened with a name multiple times', async () => {
      let err

      try {
        db1 = await orbitdb1.open('helloworld1')
        db2 = await orbitdb1.open('helloworld1')
      } catch (e) {
        err = e
      }

      strictEqual(err, undefined)
      strictEqual(db1.name, 'helloworld1')
      strictEqual(db2.name, 'helloworld1')
      strictEqual(db1.address, db2.address)
    })
  })

  describe('opening same database after stopping OrbitDB', () => {
    let orbitdb
    let db

    after(async () => {
      if (db) {
        await db.close()
      }
      if (orbitdb) {
        await orbitdb.stop()
      }
      await rimraf('./orbitdb')
    })

    it('returns the database instance', async () => {
      let err

      try {
        orbitdb = await createOrbitDB({ ipfs: ipfs1, id: 'user1' })
        db = await orbitdb.open('helloworld1')
        await orbitdb.stop()
        orbitdb = await createOrbitDB({ ipfs: ipfs1, id: 'user1' })
        db = await orbitdb.open('helloworld1')
      } catch (e) {
        err = e
      }

      strictEqual(err, undefined)
      strictEqual(db.name, 'helloworld1')
    })
  })
})
