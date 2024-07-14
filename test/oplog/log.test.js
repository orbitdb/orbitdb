import { notStrictEqual, deepStrictEqual, strictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { copy } from 'fs-extra'
import { Log, Entry, Identities, KeyStore, MemoryStorage } from '../../src/index.js'
import testKeysPath from '../fixtures/test-keys-path.js'

const { create } = Entry

const keysPath = './testkeys'

describe('Log', function () {
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
      const one = await create(testIdentity, 'A', 'entryA', null, null, [])
      const { hash: hash1, bytes: bytes1 } = await Entry.encode(one)
      const two = await create(testIdentity, 'A', 'entryB', null, null, [hash1])
      const { hash: hash2, bytes: bytes2 } = await Entry.encode(two)
      const three = await create(testIdentity, 'A', 'entryC', null, null, [hash2])
      const { hash: hash3, bytes: bytes3 } = await Entry.encode(three)
      const four = await create(testIdentity, 'A', 'entryD', null, null, [hash3])
      const { hash: hash4, bytes: bytes4 } = await Entry.encode(four)
      const entryStorage = await MemoryStorage()
      await entryStorage.put(hash1, bytes1)
      await entryStorage.put(hash2, bytes2)
      await entryStorage.put(hash3, bytes3)
      await entryStorage.put(hash4, bytes4)
      three.hash = hash3
      two.hash = hash2
      const log = await Log(testIdentity, { logId: 'A', logHeads: [three, three, two, two], entryStorage })
      const values = await log.values()
      const heads = await log.heads()
      strictEqual(heads.length, 1)
      strictEqual(heads[0].hash, three.hash)
      strictEqual(values.length, 3)
    })

    it('sets two heads if two given as params', async () => {
      const one = await create(testIdentity, 'A', 'entryA', null, null, [])
      const { hash: hash1, bytes: bytes1 } = await Entry.encode(one)
      const two = await create(testIdentity, 'A', 'entryB', null, null, [hash1])
      const { hash: hash2, bytes: bytes2 } = await Entry.encode(two)
      const three = await create(testIdentity, 'A', 'entryC', null, null, [hash2])
      const { hash: hash3, bytes: bytes3 } = await Entry.encode(three)
      const four = await create(testIdentity, 'A', 'entryD', null, null, [hash2])
      const { hash: hash4, bytes: bytes4 } = await Entry.encode(four)
      const entryStorage = await MemoryStorage()
      await entryStorage.put(hash1, bytes1)
      await entryStorage.put(hash2, bytes2)
      await entryStorage.put(hash3, bytes3)
      await entryStorage.put(hash4, bytes4)
      three.hash = hash3
      four.hash = hash4
      two.hash = hash2
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
