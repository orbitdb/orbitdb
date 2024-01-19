import { strictEqual, notStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { copy } from 'fs-extra'
import { Log, Identities, KeyStore } from '../src/index.js'
import { IPFSBlockStorage, MemoryStorage, LRUStorage, ComposedStorage } from '../src/storage/index.js'
import testKeysPath from './fixtures/test-keys-path.js'
import createHelia from './utils/create-helia.js'

const keysPath = './testkeys'

describe('Storages', function () {
  this.timeout(5000)

  let ipfs
  let keystore
  let testIdentity

  before(async () => {
    ipfs = await createHelia()
    await copy(testKeysPath, keysPath)
    keystore = await KeyStore({ path: keysPath })

    const identities = await Identities({ keystore })
    testIdentity = await identities.createIdentity({ id: 'userA' })
  })

  after(async () => {
    if (ipfs) {
      await ipfs.stop()
    }

    if (keystore) {
      await keystore.close()
    }

    await rimraf('./ipfs1')
    await rimraf(keysPath)
  })

  const runTestWithStorage = async (storage) => {
    const amount = 100
    const log1 = await Log(testIdentity, { logId: 'A', entryStorage: storage })
    const log2 = await Log(testIdentity, { logId: 'A', entryStorage: storage })
    for (let i = 0; i < amount; i++) {
      await log1.append('hello' + i)
      await log2.append('hello' + i)
    }
    const values = await log1.values()
    const heads = await log1.heads()
    strictEqual(heads.length, 1)
    strictEqual(values.length, amount)
    await log1.storage.clear()
    await log2.storage.clear()
    await log1.storage.close()
    await log2.storage.close()
  }

  describe('LRUStorage', () => {
    it('tests the storage', async () => {
      const storage = await LRUStorage()
      notStrictEqual(storage, undefined)
      await runTestWithStorage(storage)
    })
  })

  describe('MemoryStorage', () => {
    it('tests the storage', async () => {
      const storage = await MemoryStorage()
      notStrictEqual(storage, undefined)
      await runTestWithStorage(storage)
    })
  })

  describe('IPFSBlockStorage', () => {
    it('tests the storage', async () => {
      const storage = await IPFSBlockStorage({ ipfs })
      notStrictEqual(storage, undefined)
      await runTestWithStorage(storage)
    })
  })

  describe('Composed Storages', () => {
    it('tests Memory + IPFSBlockStorage composition', async () => {
      const storage1 = await MemoryStorage()
      const storage2 = await IPFSBlockStorage({ ipfs })
      const storage = await ComposedStorage(storage1, storage2)
      notStrictEqual(storage, undefined)
      await runTestWithStorage(storage)
    })

    it('tests LRU + IPFSBlockStorage composition', async () => {
      const storage1 = await LRUStorage({ size: -1 })
      const storage2 = await IPFSBlockStorage({ ipfs })
      const storage = await ComposedStorage(storage1, storage2)
      notStrictEqual(storage, undefined)
      await runTestWithStorage(storage)
    })

    it('tests Memory + LRU composition', async () => {
      const storage1 = await MemoryStorage()
      const storage2 = await LRUStorage({ size: -1 })
      const storage = await ComposedStorage(storage1, storage2)
      notStrictEqual(storage, undefined)
      await runTestWithStorage(storage)
    })

    it('tests LRU + Memory composition', async () => {
      const storage1 = await LRUStorage({ size: -1 })
      const storage2 = await MemoryStorage()
      const storage = await ComposedStorage(storage1, storage2)
      notStrictEqual(storage, undefined)
      await runTestWithStorage(storage)
    })
  })
})
