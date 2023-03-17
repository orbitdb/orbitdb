import { deepStrictEqual, strictEqual, notStrictEqual } from 'assert'
import path from 'path'
import fs from 'fs'
import rmrf from 'rimraf'
import { copy } from 'fs-extra'
import * as IPFS from 'ipfs'
import { Log, Entry, Database, KeyStore, Identities } from '../../src/index.js'
import { KeyValuePersisted } from '../../src/db/index.js'
import config from '../config.js'
import testKeysPath from '../fixtures/test-keys-path.js'

const OpLog = { Log, Entry }
const keysPath = './testkeys'

describe('KeyValuePersisted Database', function () {
  let ipfs
  let keystore
  let accessController
  let identities
  let testIdentity1
  let db

  const databaseId = 'keyvalue-AAA'

  before(async () => {
    ipfs = await IPFS.create({ ...config.daemon1, repo: './ipfs1' })

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

    await rmrf(keysPath)
    await rmrf('./orbitdb')
    await rmrf('./ipfs1')
  })

  describe('Creating a KeyValuePersisted database', () => {
    beforeEach(async () => {
      db = await KeyValuePersisted({ OpLog, Database, ipfs, identity: testIdentity1, address: databaseId, accessController })
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

    it('creates a directory for the persisted index', async () => {
      const expectedPath = path.join('./orbitdb', `./${db.address}`, '/_index')
      const directoryExists = fs.existsSync(expectedPath)
      strictEqual(directoryExists, true)
    })

    it('returns 0 items when it\'s a fresh database', async () => {
      const all = []
      for await (const item of db.iterator()) {
        all.unshift(item)
      }

      strictEqual(all.length, 0)
    })
  })

  describe('KeyValuePersisted database API', () => {
    beforeEach(async () => {
      db = await KeyValuePersisted({ OpLog, Database, ipfs, identity: testIdentity1, address: databaseId, accessController })
    })

    afterEach(async () => {
      if (db) {
        await db.drop()
        await db.close()
      }
    })

    it('sets a key/value pair', async () => {
      const expected = 'zdpuAqEDJtUf3Kxg6qZgGv8XFqjtSyyxjF8qbz176Kcro5zwr'

      const actual = await db.set('key1', 'value1')
      strictEqual(actual, expected)
    })

    it('puts a key/value pair', async () => {
      const expected = 'zdpuAqEDJtUf3Kxg6qZgGv8XFqjtSyyxjF8qbz176Kcro5zwr'

      const actual = await db.put('key1', 'value1')
      strictEqual(actual, expected)
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
        { hash: 'zdpuAm6QEA29wFnd6re7X2XWe7AmrzVbsvdHhSPXci2CqXryw', key: 'key1', value: 'init' },
        { hash: 'zdpuAvfTQwogEAhEaAtb85ugEzxvfDVUnALoZeNbrz3s4jMYd', key: 'key2', value: true },
        { hash: 'zdpuB2CBCwvPBdHjZRKfFtL5JuDo9sc5QinKhbtYu1YkCLq22', key: 'key3', value: 'hello' },
        { hash: 'zdpuAyWWtvFfxKWMcV3NJ7XXbjiQC6MkA8h6TrhFA2ihLrt82', key: 'key4', value: 'friend' },
        { hash: 'zdpuB2Z5coKXGMAZtb7X8UQYgo6vWAP4VshBvE4xwBCrR5Laa', key: 'key5', value: '12345' },
        { hash: 'zdpuAnn2kuStzcTCJ5ULMxCvB7RtgAScJPmg3YAVYju4oPEtC', key: 'key6', value: 'empty' },
        { hash: 'zdpuAv1jSFz4GHRieAXGvRGnVWdEdxDp2HefREoTJJWYC8Zqw', key: 'key7', value: 'friend33' }
      ]

      for (const { key, value } of Object.values(keyvalue)) {
        await db.put(key, value)
      }

      const all = []
      for await (const pair of db.iterator()) {
        all.unshift(pair)
      }

      deepStrictEqual(all, keyvalue)
    })
  })

  describe('Iterator', () => {
    before(async () => {
      db = await KeyValuePersisted({ OpLog, Database, ipfs, identity: testIdentity1, address: databaseId, accessController })
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

    it('returns no documents when the database is empty', async () => {
      const all = []
      for await (const { key, value } of db.iterator()) {
        all.unshift({ key, value })
      }
      strictEqual(all.length, 0)
    })

    it('returns all documents when the database is not empty', async () => {
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

    it('returns only the amount of documents given as a parameter', async () => {
      const amount = 3
      const all = []
      for await (const { key, value } of db.iterator({ amount })) {
        all.unshift({ key, value })
      }
      strictEqual(all.length, amount)
    })

    it('returns only two documents if amount given as a parameter is 2', async () => {
      const amount = 2
      const all = []
      for await (const { key, value } of db.iterator({ amount })) {
        all.unshift({ key, value })
      }
      strictEqual(all.length, amount)
    })

    it('returns only one document if amount given as a parameter is 1', async () => {
      const amount = 1
      const all = []
      for await (const { key, value } of db.iterator({ amount })) {
        all.unshift({ key, value })
      }
      strictEqual(all.length, amount)
    })
  })
})
