import { notStrictEqual, deepStrictEqual, strictEqual } from 'assert'
import rimraf from 'rimraf'
import { Log, Entry } from '../../src/oplog/index.js'
import { Identities } from '../../src/identities/index.js'
import KeyStore from '../../src/key-store.js'
import { copy } from 'fs-extra'
import MemoryStorage from '../../src/storage/memory.js'

// Test utils
import { config, testAPIs } from 'orbit-db-test-utils'

const { sync: rmrf } = rimraf
const { create } = Entry
const { createIdentity } = Identities

let testIdentity

Object.keys(testAPIs).forEach((IPFS) => {
  describe('Log (' + IPFS + ')', function () {
    this.timeout(config.timeout)

    const { identityKeyFixtures, signingKeyFixtures, identityKeysPath, signingKeysPath } = config

    let keystore, signingKeyStore
    let identities

    before(async () => {
      await copy(identityKeyFixtures, identityKeysPath)
      await copy(signingKeyFixtures, signingKeysPath)

      keystore = new KeyStore(identityKeysPath)
      signingKeyStore = new KeyStore(signingKeysPath)

      const storage = await MemoryStorage()

      identities = await Identities({ keystore, signingKeyStore, storage })
      testIdentity = await identities.createIdentity({ id: 'userA' })
    })

    after(async () => {
      rmrf(signingKeysPath)
      rmrf(identityKeysPath)

      await keystore.close()
      await signingKeyStore.close()
    })

    describe('create', async () => {
      it('creates an empty log with default params', async () => {
        const log = await Log(testIdentity)
        notStrictEqual(log.heads, undefined)
        notStrictEqual(log.id, undefined)
        notStrictEqual(log.id, undefined)
        notStrictEqual(log.clock(), undefined)
        notStrictEqual(await log.heads(), undefined)
        deepStrictEqual(await log.heads(), [])

        const values = await log.values()
        deepStrictEqual(values, [])
      })

      it('sets an id', async () => {
        const log = await Log(testIdentity, { logId: 'ABC' })
        strictEqual(log.id, 'ABC')
      })

      it('sets the clock id', async () => {
        const log = await Log(testIdentity, { logId: 'ABC' })
        strictEqual(log.id, 'ABC')
        strictEqual((await log.clock()).id, testIdentity.publicKey)
      })

      it('generates id string if id is not passed as an argument', async () => {
        const log = await Log(testIdentity)
        strictEqual(typeof log.id === 'string', true)
      })

      it('sets one head if multiple are given as params', async () => {
        const one = await create(testIdentity, 'A', 'entryA', null, [])
        const two = await create(testIdentity, 'A', 'entryB', null, [one.hash])
        const three = await create(testIdentity, 'A', 'entryC', null, [two.hash])
        const four = await create(testIdentity, 'A', 'entryD', null, [two.hash])
        const entryStorage = await MemoryStorage()
        await entryStorage.put(one.hash, one.bytes)
        await entryStorage.put(two.hash, two.bytes)
        await entryStorage.put(three.hash, three.bytes)
        await entryStorage.put(four.hash, four.bytes)
        const log = await Log(testIdentity, { logId: 'A', logHeads: [three, three, two, two], entryStorage })
        const values = await log.values()
        const heads = await log.heads()
        strictEqual(heads.length, 1)
        strictEqual(heads[0].hash, three.hash)
        strictEqual(values.length, 3)
      })

      it('sets two heads if two given as params', async () => {
        const one = await create(testIdentity, 'A', 'entryA', null, [])
        const two = await create(testIdentity, 'A', 'entryB', null, [one.hash])
        const three = await create(testIdentity, 'A', 'entryC', null, [two.hash])
        const four = await create(testIdentity, 'A', 'entryD', null, [two.hash])
        const entryStorage = await MemoryStorage()
        await entryStorage.put(one.hash, one.bytes)
        await entryStorage.put(two.hash, two.bytes)
        await entryStorage.put(three.hash, three.bytes)
        await entryStorage.put(four.hash, four.bytes)
        const log = await Log(testIdentity, { logId: 'A', logHeads: [three, four, two], entryStorage })
        const values = await log.values()
        const heads = await log.heads()
        strictEqual(heads.length, 2)
        strictEqual(heads[1].hash, three.hash)
        strictEqual(heads[0].hash, four.hash)
        strictEqual(values.length, 4)
      })

      it('throws an error if heads is not an array', async () => {
        let err
        try {
          await Log(testIdentity, { logId: 'A', entries: [], logHeads: {} })
        } catch (e) {
          err = e
        }
        notStrictEqual(err, undefined)
        strictEqual(err.message, '\'logHeads\' argument must be an array')
      })

      it('creates default public AccessController if not defined', async () => {
        const log = await Log(testIdentity)
        const anyoneCanAppend = await log.access.canAppend('any')
        notStrictEqual(log.access, undefined)
        strictEqual(anyoneCanAppend, true)
      })

      it('throws an error if identity is not defined', async () => {
        let err
        try {
          await Log()
        } catch (e) {
          err = e
        }
        notStrictEqual(err, undefined)
        strictEqual(err.message, 'Identity is required')
      })
    })

    describe('values', () => {
      it('returns all entries in the log', async () => {
        const log = await Log(testIdentity)
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
