import { deepStrictEqual } from 'assert'
import LevelStorage from '../src/storage/level.js'
import LRUStorage from '../src/storage/lru.js'
import KeyStore from '../src/key-store.js'
import { config, testAPIs } from 'orbit-db-test-utils'
// import { userA } from '../fixtures/orbit-db-identity-keys.js'

Object.keys(testAPIs).forEach((IPFS) => {
  describe('KeyStore (' + IPFS + ')', () => {
    let keystore
    beforeEach(async () => {
      const storage = await LevelStorage('./keys_1')
      const cache = await LRUStorage(100)
      keystore = await KeyStore({ storage, cache })
    })

    it('creates a key', async () => {
      const id = 'key1'
      console.log(await keystore.createKey(id))
    })

    it('gets a key', async () => {
      const id = 'key1'
      const keys = await keystore.createKey(id)
      deepStrictEqual(await keystore.getKey(id), keys)
    })

    afterEach(async () => {
      keystore.close()
    })
  })
})
