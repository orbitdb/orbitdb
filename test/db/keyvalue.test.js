import { deepStrictEqual, strictEqual } from 'assert'
import rmrf from 'rimraf'
import { Log, Entry } from '../../src/oplog/index.js'
import { KeyValue } from '../../src/db/index.js'
import { Database } from '../../src/index.js'
import { config, testAPIs, startIpfs, stopIpfs } from 'orbit-db-test-utils'
import { createTestIdentities, cleanUpTestIdentities } from '../fixtures/orbit-db-identity-keys.js'

const OpLog = { Log, Entry }

Object.keys(testAPIs).forEach((IPFS) => {
  describe('KeyValue Database (' + IPFS + ')', function () {
    let ipfsd
    let ipfs
    let accessController
    let identities1
    let testIdentity1
    let db

    const databaseId = 'keyvalue-AAA'

    before(async () => {
      ipfsd = await startIpfs(IPFS, config.daemon1)
      ipfs = ipfsd.api

      const [identities, testIdentities] = await createTestIdentities(ipfs)
      identities1 = identities[0]
      testIdentity1 = testIdentities[0]
    })

    after(async () => {
      await cleanUpTestIdentities([identities1])

      if (ipfsd) {
        await stopIpfs(ipfsd)
      }

      await rmrf('./orbitdb')
    })

    beforeEach(async () => {
      db = await KeyValue({ OpLog, Database, ipfs, identity: testIdentity1, address: databaseId, accessController })
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
})
