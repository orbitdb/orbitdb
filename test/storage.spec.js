import * as IPFS from 'ipfs'
import { strictEqual, notStrictEqual } from 'assert'
import rimraf from 'rimraf'
import { Log } from '../src/oplog/index.js'
import { Identities } from '../src/identities/index.js'
import KeyStore from '../src/key-store.js'
import { IPFSBlockStorage, MemoryStorage, LRUStorage, ComposedStorage } from '../src/storage/index.js'
import { copy } from 'fs-extra'

// Test utils
import { config, testAPIs } from 'orbit-db-test-utils'

const { sync: rmrf } = rimraf
const { createIdentity } = Identities

Object.keys(testAPIs).forEach((_) => {
  describe('Storages (' + _ + ')', function () {
    this.timeout(config.timeout)

    const { identityKeyFixtures, signingKeyFixtures, identityKeysPath, signingKeysPath } = config

    let ipfs1
    let keystore, signingKeyStore
    let testIdentity1

    before(async () => {
      rmrf(identityKeysPath)
      rmrf(signingKeysPath)
      await copy(identityKeyFixtures, identityKeysPath)
      await copy(signingKeyFixtures, signingKeysPath)

      rmrf('./ipfs1')
      await copy('./test/fixtures/ipfs1', './ipfs1')

      // Start an IPFS instance
      ipfs1 = await IPFS.create({ ...config.daemon1, repo: './ipfs1' })

      keystore = new KeyStore(identityKeysPath)
      signingKeyStore = new KeyStore(signingKeysPath)

      const storage = await MemoryStorage()
      const identities = await Identities({ keystore, signingKeyStore, storage })
      testIdentity1 = await identities.createIdentity({ id: 'userA' })
    })

    after(async () => {
      if (ipfs1) {
        await ipfs1.stop()
      }
      if (keystore) {
        await keystore.close()
      }
      if (signingKeyStore) {
        await signingKeyStore.close()
      }
      rmrf(identityKeysPath)
      rmrf(signingKeysPath)
      rmrf(testIdentity1.id)
      rmrf('./orbitdb')
      rmrf('./ipfs1')
    })

    const runTestWithStorage = async (storage) => {
      const amount = 100
      const log1 = await Log(testIdentity1, { logId: 'A', storage })
      const log2 = await Log(testIdentity1, { logId: 'A', storage })
      for (let i = 0; i < amount; i++) {
        await log1.append('hello' + i)
        await log2.append('hello' + i)
      }
      // await log2.join(log1)
      const values = await log1.values()
      const heads = await log1.heads()
      strictEqual(heads.length, 1)
      strictEqual(values.length, amount)
      await log1.storage.clear()
      await log2.storage.clear()
      // const values2 = await log2.values()
      // const heads2 = await log2.heads()
      // strictEqual(heads2.length, 0)
      // strictEqual(values2.length, 0)
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
        const storage = await IPFSBlockStorage({ ipfs: ipfs1 })
        notStrictEqual(storage, undefined)
        await runTestWithStorage(storage)
      })
    })

    describe('Composed Storages', () => {
      it('tests Memory + IPFSBlockStorage composition', async () => {
        const storage1 = await MemoryStorage()
        const storage2 = await IPFSBlockStorage({ ipfs: ipfs1 })
        const storage = await ComposedStorage(storage1, storage2)
        notStrictEqual(storage, undefined)
        await runTestWithStorage(storage)
      })

      it('tests LRU + IPFSBlockStorage composition', async () => {
        const storage1 = await LRUStorage({ size: -1 })
        const storage2 = await IPFSBlockStorage({ ipfs: ipfs1 })
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
})
