import { deepStrictEqual, strictEqual } from 'assert'
import rmrf from 'rimraf'
import { copy } from 'fs-extra'
import * as IPFS from 'ipfs'
import { Log, Entry, Database, KeyStore, Identities } from '../../src/index.js'
import { KeyValuePersisted, KeyValue } from '../../src/db/index.js'
import config from '../config.js'
import testKeysPath from '../fixtures/test-keys-path.js '

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

  beforeEach(async () => {
    db = await KeyValuePersisted({ OpLog, KeyValue, Database, ipfs, identity: testIdentity1, address: databaseId, accessController })
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

  it('sets a key/value pair', async () => {
    const expected = 'zdpuAuXyxGeC6QC2rykxcdZFUoyRromkc9zMHz3LwLHxVVz2x'

    const actual = await db.set('key1', 'value1')
    strictEqual(actual, expected)
  })

  it('puts a key/value pair', async () => {
    const expected = 'zdpuAuXyxGeC6QC2rykxcdZFUoyRromkc9zMHz3LwLHxVVz2x'

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
    const expected = undefined

    await db.put(key, 'value1')
    const hash = await db.del(key)

    const actual = await db.get(hash)
    strictEqual(actual, expected)
  })

  it('deletes a non-existent key/value pair', async () => {
    const expected = undefined

    const del = await db.del('zdpuApFgnZNp6qQqeuHRLJhEKsmMnXEEJfSZofLc3ZZXEihWE')

    const actual = await db.get(del)
    strictEqual(actual, expected)
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

    deepStrictEqual(all, keyvalue)
  })
})
