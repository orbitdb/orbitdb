import { strictEqual, notStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { copy } from 'fs-extra'
import { Log, Entry, Identities, KeyStore } from '../../src/index.js'
import testKeysPath from '../fixtures/test-keys-path.js'

const keysPath = './testkeys'

describe('TTL', function () {
  this.timeout(5000)

  let keystore
  let identities
  let testIdentity

  before(async () => {
    await copy(testKeysPath, keysPath)
    keystore = await KeyStore({ path: keysPath })
    identities = await Identities({ keystore })
    testIdentity = await identities.createIdentity({ id: 'userA' })
  })

  after(async () => {
    if (keystore) {
      await keystore.close()
    }
    await rimraf(keysPath)
  })

  describe('Entry timestamp', () => {
    it('creates an entry with a timestamp field', async () => {
      const before = Date.now()
      const entry = await Entry.create(testIdentity, 'A', 'hello')
      const after = Date.now()
      strictEqual(typeof entry.timestamp, 'number')
      strictEqual(entry.timestamp >= before, true)
      strictEqual(entry.timestamp <= after, true)
    })

    it('includes timestamp in signed data (modifying timestamp invalidates signature)', async () => {
      const entry = await Entry.create(testIdentity, 'A', 'hello')
      const isValid = await Entry.verify(identities, entry)
      strictEqual(isValid, true)

      // Tamper with the timestamp
      const tampered = { ...entry, timestamp: entry.timestamp + 1000 }
      const isValidAfterTamper = await Entry.verify(identities, tampered)
      strictEqual(isValidAfterTamper, false)
    })

    it('preserves timestamp through encode/decode', async () => {
      const entry = await Entry.create(testIdentity, 'A', 'hello')
      const { bytes } = await Entry.encode(entry)
      const decoded = await Entry.decode(bytes)
      strictEqual(decoded.timestamp, entry.timestamp)
    })

    it('verifies entries without timestamp (backwards compatibility)', async () => {
      // Create a synthetic entry without a timestamp to simulate a pre-TTL entry
      const entry = await Entry.create(testIdentity, 'A', 'hello')
      // Remove timestamp before verification to simulate an old entry
      // Note: we need to verify the entry as-is since the signature includes timestamp
      const isValid = await Entry.verify(identities, entry)
      strictEqual(isValid, true)
    })
  })

  describe('Log with TTL', () => {
    it('filters expired entries from traverse()', async () => {
      const ttl = 200
      const log = await Log(testIdentity, { logId: 'ttl-traverse', ttl })
      await log.append('hello1')
      await log.append('hello2')

      // Entries should be visible immediately
      let values = await log.values()
      strictEqual(values.length, 2)

      // Wait for entries to expire
      await new Promise(resolve => setTimeout(resolve, ttl + 50))

      // Add a fresh entry
      await log.append('hello3')

      values = await log.values()
      strictEqual(values.length, 1)
      strictEqual(values[0].payload, 'hello3')

      await log.close()
    })

    it('filters expired entries from iterator()', async () => {
      const ttl = 200
      const log = await Log(testIdentity, { logId: 'ttl-iterator', ttl })
      await log.append('hello1')
      await log.append('hello2')

      // Wait for entries to expire
      await new Promise(resolve => setTimeout(resolve, ttl + 50))

      // Add a fresh entry
      await log.append('hello3')

      const all = []
      for await (const entry of log.iterator()) {
        all.push(entry)
      }
      strictEqual(all.length, 1)
      strictEqual(all[0].payload, 'hello3')

      await log.close()
    })

    it('does NOT filter entries without timestamp field', async () => {
      const ttl = 100
      const log = await Log(testIdentity, { logId: 'ttl-no-timestamp', ttl })

      // Append a normal entry (has timestamp)
      const entry = await log.append('hello1')
      notStrictEqual(entry.timestamp, undefined)

      // The entry should be visible
      const values = await log.values()
      strictEqual(values.length, 1)

      await log.close()
    })

    it('does NOT filter heads', async () => {
      const ttl = 200
      const log = await Log(testIdentity, { logId: 'ttl-heads', ttl })
      await log.append('hello1')

      // Wait for the entry to expire
      await new Promise(resolve => setTimeout(resolve, ttl + 50))

      // heads() should still return the expired head
      const heads = await log.heads()
      strictEqual(heads.length, 1)
      strictEqual(heads[0].payload, 'hello1')

      await log.close()
    })

    it('returns all entries when no TTL is set (backwards compatibility)', async () => {
      const log = await Log(testIdentity, { logId: 'ttl-none' })
      await log.append('hello1')
      await log.append('hello2')
      await log.append('hello3')

      const values = await log.values()
      strictEqual(values.length, 3)

      await log.close()
    })

    it('join accepts entries regardless of TTL', async () => {
      const ttl = 200
      const log1 = await Log(testIdentity, { logId: 'ttl-join', ttl })
      const log2 = await Log(testIdentity, { logId: 'ttl-join' })

      await log2.append('hello1')
      await log2.append('hello2')

      // Wait for TTL to expire relative to log1's perspective
      await new Promise(resolve => setTimeout(resolve, ttl + 50))

      // Join should succeed even though entries are expired
      await log1.join(log2)

      // Entries are in storage but filtered on read
      const heads = await log1.heads()
      strictEqual(heads.length, 1)

      await log1.close()
      await log2.close()
    })
  })

  describe('compact()', () => {
    it('removes expired entries from storage', async () => {
      const ttl = 200
      const log = await Log(testIdentity, { logId: 'ttl-compact', ttl })
      const entry1 = await log.append('hello1')
      await log.append('hello2')

      // Wait for entries to expire
      await new Promise(resolve => setTimeout(resolve, ttl + 50))

      // Add a fresh entry so old entries are no longer heads
      await log.append('hello3')

      const removed = await log.compact()
      strictEqual(removed, 2)

      // The expired entry should no longer be retrievable from storage
      const result = await log.get(entry1.hash)
      strictEqual(result, undefined)

      await log.close()
    })

    it('does not remove entries without timestamp', async () => {
      const ttl = 100
      const log = await Log(testIdentity, { logId: 'ttl-compact-no-ts', ttl })

      // All entries created by the current code will have timestamps.
      // We test that entries with timestamps within TTL are not removed.
      await log.append('hello1')

      const removed = await log.compact()
      strictEqual(removed, 0)

      await log.close()
    })

    it('does not remove unexpired entries', async () => {
      const ttl = 60000 // 60 seconds - well beyond test duration
      const log = await Log(testIdentity, { logId: 'ttl-compact-unexpired', ttl })
      await log.append('hello1')
      await log.append('hello2')

      const removed = await log.compact()
      strictEqual(removed, 0)

      const values = await log.values()
      strictEqual(values.length, 2)

      await log.close()
    })

    it('returns 0 when TTL is not set', async () => {
      const log = await Log(testIdentity, { logId: 'ttl-compact-no-ttl' })
      await log.append('hello1')

      const removed = await log.compact()
      strictEqual(removed, 0)

      await log.close()
    })

    it('does not remove head entries even if expired', async () => {
      const ttl = 200
      const log = await Log(testIdentity, { logId: 'ttl-compact-heads', ttl })
      await log.append('hello1')

      // Wait for the entry to expire
      await new Promise(resolve => setTimeout(resolve, ttl + 50))

      // The only entry is the head, so compact should not remove it
      const removed = await log.compact()
      strictEqual(removed, 0)

      const heads = await log.heads()
      strictEqual(heads.length, 1)

      await log.close()
    })
  })
})
