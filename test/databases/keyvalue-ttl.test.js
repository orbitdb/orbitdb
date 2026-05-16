import { strictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { copy } from 'fs-extra'
import { KeyStore, Identities } from '../../src/index.js'
import KeyValue from '../../src/databases/keyvalue.js'
import testKeysPath from '../fixtures/test-keys-path.js'
import createHelia from '../utils/create-helia.js'

const keysPath = './testkeys'

describe('KeyValue Database with TTL', function () {
  this.timeout(10000)

  let ipfs
  let keystore
  let identities
  let testIdentity1
  let db

  const databaseId = 'keyvalue-ttl-AAA'

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

  describe('TTL expiry', () => {
    afterEach(async () => {
      if (db) {
        await db.drop()
        await db.close()
      }
    })

    it('get() returns undefined for keys whose only PUT is expired', async () => {
      const ttl = 200
      db = await KeyValue()({ ipfs, identity: testIdentity1, address: databaseId, ttl })

      await db.put('key1', 'value1')

      // Value should be accessible immediately
      const before = await db.get('key1')
      strictEqual(before, 'value1')

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, ttl + 50))

      const after = await db.get('key1')
      strictEqual(after, undefined)
    })

    it('put() followed by TTL expiry makes key inaccessible', async () => {
      const ttl = 200
      db = await KeyValue()({ ipfs, identity: testIdentity1, address: databaseId, ttl })

      await db.put('key1', 'value1')
      await db.put('key2', 'value2')

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, ttl + 50))

      // Both keys should be inaccessible
      strictEqual(await db.get('key1'), undefined)
      strictEqual(await db.get('key2'), undefined)

      // New puts should still work
      await db.put('key3', 'value3')
      strictEqual(await db.get('key3'), 'value3')
    })

    it('works as before with no TTL', async () => {
      db = await KeyValue()({ ipfs, identity: testIdentity1, address: databaseId })

      await db.put('key1', 'value1')
      await db.put('key2', 'value2')

      strictEqual(await db.get('key1'), 'value1')
      strictEqual(await db.get('key2'), 'value2')
    })
  })
})
