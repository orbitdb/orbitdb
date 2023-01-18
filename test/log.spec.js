import { notStrictEqual, deepStrictEqual, strictEqual } from 'assert'
import rimraf from 'rimraf'
import Entry from '../src/entry.js'
import { Log, MemoryStorage } from '../src/log.js'
import IdentityProvider from 'orbit-db-identity-provider'
import Keystore from '../src/Keystore.js'
import { copy } from 'fs-extra'

// Test utils
import { config, testAPIs } from 'orbit-db-test-utils'

const { sync: rmrf } = rimraf
const { create } = Entry
const { createIdentity } = IdentityProvider

let testIdentity

Object.keys(testAPIs).forEach((IPFS) => {
  describe('Log (' + IPFS + ')', function () {
    this.timeout(config.timeout)

    const { identityKeyFixtures, signingKeyFixtures, identityKeysPath, signingKeysPath } = config

    let keystore, signingKeystore

    before(async () => {
      await copy(identityKeyFixtures, identityKeysPath)
      await copy(signingKeyFixtures, signingKeysPath)

      keystore = new Keystore(identityKeysPath)
      signingKeystore = new Keystore(signingKeysPath)

      testIdentity = await createIdentity({ id: 'userA', keystore, signingKeystore })
    })

    after(async () => {
      rmrf(signingKeysPath)
      rmrf(identityKeysPath)

      await keystore.close()
      await signingKeystore.close()
    })

    describe('constructor', async () => {
      it('creates an empty log with default params', async () => {
        const log = Log(testIdentity)
        notStrictEqual(log.heads, undefined)
        notStrictEqual(log.id, undefined)
        notStrictEqual(log.id, undefined)
        notStrictEqual(log.clock(), undefined)
        notStrictEqual(log.heads(), undefined)
        deepStrictEqual(log.heads(), [])

        const values = await log.values()
        deepStrictEqual(values, [])
      })

      it('sets an id', () => {
        const log = Log(testIdentity, { logId: 'ABC' })
        strictEqual(log.id, 'ABC')
      })

      it('sets the clock id', () => {
        const log = Log(testIdentity, { logId: 'ABC' })
        strictEqual(log.id, 'ABC')
        strictEqual(log.clock().id, testIdentity.publicKey)
      })

      it('generates id string if id is not passed as an argument', () => {
        const log = Log(testIdentity)
        strictEqual(typeof log.id === 'string', true)
      })

      it('sets heads if given as params', async () => {
        const one = await create(testIdentity, 'A', 'entryA', null, [])
        const two = await create(testIdentity, 'A', 'entryB', null, [one.hash])
        const three = await create(testIdentity, 'A', 'entryC', null, [two.hash])
        const storage = MemoryStorage()
        await storage.add(one.hash, one.bytes)
        await storage.add(two.hash, two.bytes)
        await storage.add(three.hash, three.bytes)
        const log = Log(testIdentity, { logId: 'A', logHeads: [three], storage })
        const values = await log.values()
        strictEqual(log.heads().length, 1)
        strictEqual(log.heads()[0].hash, three.hash)
        strictEqual(values.length, 3)
      })

      it('throws an error if heads is not an array', () => {
        let err
        try {
          Log(testIdentity, { logId: 'A', entries: [], logHeads: {} })
        } catch (e) {
          err = e
        }
        notStrictEqual(err, undefined)
        strictEqual(err.message, '\'logHeads\' argument must be an array')
      })

      it('creates default public AccessController if not defined', async () => {
        const log = Log(testIdentity)
        const anyoneCanAppend = await log.access.canAppend('any')
        notStrictEqual(log.access, undefined)
        strictEqual(anyoneCanAppend, true)
      })

      it('throws an error if identity is not defined', () => {
        let err
        try {
          Log()
        } catch (e) {
          err = e
        }
        notStrictEqual(err, undefined)
        strictEqual(err.message, 'Identity is required')
      })
    })

    describe('values', () => {
      it('returns all entries in the log', async () => {
        const log = Log(testIdentity)
        let values = await log.values()
        strictEqual(values instanceof Array, true)
        strictEqual(values.length, 0)
        await log.append('hello1')
        await log.append('hello2')
        await log.append('hello3')
        values = await log.values()
        strictEqual(values instanceof Array, true)
        strictEqual(values.length, 3)
        strictEqual(values[0].payload, 'hello1')
        strictEqual(values[1].payload, 'hello2')
        strictEqual(values[2].payload, 'hello3')
      })
    })
  })
})
