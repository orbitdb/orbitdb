import { deepStrictEqual, strictEqual, notStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { copy } from 'fs-extra'
import { KeyStore, Identities } from '../../src/index.js'
import KeyValue from '../../src/databases/keyvalue.js'
import testKeysPath from '../fixtures/test-keys-path.js'
import createHelia from '../utils/create-helia.js'

const keysPath = './testkeys'

describe('KeyValue Database', function () {
  let ipfs
  let keystore
  let accessController
  let identities
  let testIdentity1
  let db

  const databaseId = 'keyvalue-AAA'

  before(async () => {
    ipfs = await createHelia()

    await copy(testKeysPath, keysPath)
    keystore = await KeyStore({ path: keysPath })
    identities = await Identities({ keystore })
    testIdentity1 = await identities.createIdentity({ id: 'userA' })
  })

  after(async () => {
    if (ipfs) {
      await ipfs.stop()
    }

    if (keystore) {
      await keystore.close()
    }

    await rimraf(keysPath)
    await rimraf('./orbitdb')
    await rimraf('./ipfs1')
  })

  describe('Creating a KeyValue database', () => {
    beforeEach(async () => {
      db = await KeyValue()({ ipfs, identity: testIdentity1, address: databaseId, accessController })
    })

    afterEach(async () => {
      if (db) {
        await db.drop()
        await db.close()
      }
    })

    it('creates a keyvalue store', async () => {
      strictEqual(db.address.toString(), databaseId)
      strictEqual(db.type, 'keyvalue')
    })

    it('returns 0 items when it\'s a fresh database', async () => {
      const all = []
      for await (const item of db.iterator()) {
        all.unshift(item)
      }

      strictEqual(all.length, 0)
    })
  })

  describe('KeyValue database API', () => {
    beforeEach(async () => {
      db = await KeyValue()({ ipfs, identity: testIdentity1, address: databaseId, accessController })
    })

    afterEach(async () => {
      if (db) {
        await db.drop()
        await db.close()
      }
    })

    it('sets a key/value pair', async () => {
      const actual = await db.set('key1', 'value1')
      strictEqual(typeof actual, 'string')
      strictEqual(actual.startsWith('zdpu'), true)
    })

    it('puts a key/value pair', async () => {
      const actual = await db.put('key1', 'value1')
      strictEqual(typeof actual, 'string')
      strictEqual(actual.startsWith('zdpu'), true)
    })

    it('gets a key/value pair\'s value', async () => {
      const key = 'key1'
      const expected = 'value1'

      await db.put(key, expected)
      const actual = await db.get(key)
      strictEqual(actual, expected)
    })

    it('get key\'s updated value when using put', async () => {
      const key = 'key1'
      const expected = 'hello2'

      await db.put(key, 'value1')
      await db.put(key, expected)
      const actual = await db.get(key)
      strictEqual(actual, expected)
    })

    it('get key\'s updated value when using set', async () => {
      const key = 'key1'
      const expected = 'hello2'

      await db.set(key, 'value1')
      await db.set(key, expected)
      const actual = await db.get(key)
      strictEqual(actual, expected)
    })

    it('get key\'s updated value when using set then put', async () => {
      const key = 'key1'
      const expected = 'hello2'

      await db.set(key, 'value1')
      await db.put(key, expected)
      const actual = await db.get(key)
      strictEqual(actual, expected)
    })

    it('get key\'s updated value when using put then set', async () => {
      const key = 'key1'
      const expected = 'hello2'

      await db.put(key, 'value1')
      await db.set(key, expected)
      const actual = await db.get(key)
      strictEqual(actual, expected)
    })

    it('deletes a key/value pair', async () => {
      const key = 'key1'

      await db.put(key, 'value1')
      await db.del(key)

      const actual = await db.get(key)
      strictEqual(actual, undefined)
    })

    it('deletes a non-existent key/value pair', async () => {
      const key = 'this key doesn\'t exist'
      await db.del(key)

      const actual = await db.get(key)
      strictEqual(actual, undefined)
    })

    it('returns all key/value pairs', async () => {
      const keyvalue = [
        { key: 'key1', value: 'init' },
        { key: 'key2', value: true },
        { key: 'key3', value: 'hello' },
        { key: 'key4', value: 'friend' },
        { key: 'key5', value: '12345' },
        { key: 'key6', value: 'empty' },
        { key: 'key7', value: 'friend33' }
      ]

      for (const { key, value } of Object.values(keyvalue)) {
        await db.put(key, value)
      }

      const all = []
      for await (const pair of db.iterator()) {
        all.unshift(pair)
      }

      strictEqual(all.length, keyvalue.length)
      for (let i = 0; i < keyvalue.length; i++) {
        strictEqual(all[i].key, keyvalue[i].key)
        deepStrictEqual(all[i].value, keyvalue[i].value)
        strictEqual(typeof all[i].hash, 'string')
      }
    })
  })

  describe('Iterator', () => {
    before(async () => {
      db = await KeyValue()({ ipfs, identity: testIdentity1, address: databaseId, accessController })
    })

    after(async () => {
      if (db) {
        await db.drop()
        await db.close()
      }
    })

    it('has an iterator function', async () => {
      notStrictEqual(db.iterator, undefined)
      strictEqual(typeof db.iterator, 'function')
    })

    it('returns no key/value pairs when the database is empty', async () => {
      const all = []
      for await (const { key, value } of db.iterator()) {
        all.unshift({ key, value })
      }
      strictEqual(all.length, 0)
    })

    it('returns all key/value pairs when the database is not empty', async () => {
      await db.put('key1', 1)
      await db.put('key2', 2)
      await db.put('key3', 3)
      await db.put('key4', 4)
      await db.put('key5', 5)

      // Add one more document and then delete it to count
      // for the fact that the amount returned should be
      // the amount of actual documents returned and not
      // the oplog length, and deleted documents don't
      // count towards the returned amount.
      await db.put('key6', 6)
      await db.del('key6')

      const all = []
      for await (const { key, value } of db.iterator()) {
        all.unshift({ key, value })
      }
      strictEqual(all.length, 5)
    })

    it('returns only the amount of key/value pairs given as a parameter', async () => {
      const amount = 3
      const all = []
      for await (const { key, value } of db.iterator({ amount })) {
        all.unshift({ key, value })
      }
      strictEqual(all.length, amount)
    })

    it('returns only two key/value pairs if amount given as a parameter is 2', async () => {
      const amount = 2
      const all = []
      for await (const { key, value } of db.iterator({ amount })) {
        all.unshift({ key, value })
      }
      strictEqual(all.length, amount)
    })

    it('returns only one key/value pairs if amount given as a parameter is 1', async () => {
      const amount = 1
      const all = []
      for await (const { key, value } of db.iterator({ amount })) {
        all.unshift({ key, value })
      }
      strictEqual(all.length, amount)
    })
  })
})
