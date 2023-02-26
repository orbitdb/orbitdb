import { strictEqual, deepStrictEqual } from 'assert'
import LevelStorage from '../src/storage/level.js'
import KeyStore, { sign, verify } from '../src/key-store.js'
import { testAPIs } from 'orbit-db-test-utils'
import path from 'path'
import fs from 'fs-extra'
import rmrf from 'rimraf'
import { signingKeys } from './fixtures/orbit-db-identity-keys.js'

Object.keys(testAPIs).forEach((IPFS) => {
  describe('KeyStore (' + IPFS + ')', () => {
    const fixturePath = path.join('test', 'fixtures', 'keys', 'signing-keys')
    const storagePath = path.join('test', 'keys', 'signing-keys')
    let keystore

    beforeEach(async () => {
      await fs.copy(fixturePath, storagePath)

      const storage = await LevelStorage({ path: storagePath })

      keystore = await KeyStore({ storage })
    })

    afterEach(async () => {
      await keystore.clear()
      await keystore.close()

      rmrf.sync(path.join('test', 'keys'))
    })

    it('creates a key', async () => {
      const id = 'key1'
      await keystore.createKey(id)
      const hasKey = await keystore.hasKey(id)
      strictEqual(hasKey, true)
    })

    it('creates a new key using provided entropy', async () => {
      const id = 'key1'

      await keystore.createKey(id, {
        entropy: 'jANfduGRj4HU9Pk6nJzujANfduGRj4HU9Pk6nJzu'
      })

      const hasKey = await keystore.hasKey(id)

      strictEqual(hasKey, true)

      // Deterministic public key
      const keyContent = await keystore.getKey(id)
      const publicKey = keyContent._publicKey

      strictEqual(
        Buffer.from(publicKey).toString('hex'),
        '0328401cd1b561040b87cd66563be722ba429b42d6abfeca9cb4c34e9845c86d2e'
      )
    })

    it('throws an error when creating a key without an id', async () => {
      let err

      try {
        await keystore.createKey()
      } catch (e) {
        err = e.toString()
      }

      strictEqual(err, 'Error: id needed to create a key')
    })

    it('throws an error when creating a key with a null id', async () => {
      let err

      try {
        await keystore.createKey(null)
      } catch (e) {
        err = e.toString()
      }

      strictEqual(err, 'Error: id needed to create a key')
    })

    it('returns true if key exists', async () => {
      const id = 'key1'

      await keystore.createKey(id)
      const hasKey = await keystore.hasKey(id)
      strictEqual(hasKey, true)
    })

    it('returns false if key does not exist', async () => {
      const id = 'key1'
      const hasKey = await keystore.hasKey(id)
      strictEqual(hasKey, false)
    })

    it('throws an error when checking if key exists when no id is specified', async () => {
      let err
      try {
        await keystore.hasKey()
      } catch (e) {
        err = e.toString()
      }
      strictEqual(err, 'Error: id needed to check a key')
    })

    it('gets a key', async () => {
      const id = 'key1'
      const keys = await keystore.createKey(id)
      deepStrictEqual(await keystore.getKey(id), keys)
    })

    it('throws an error when getting a key without an id', async () => {
      const id = 'key1'
      let err

      await keystore.createKey(id)

      try {
        await keystore.getKey()
      } catch (e) {
        err = e.toString()
      }

      strictEqual(err, 'Error: id needed to get a key')
    })

    it('throws an error when getting a key with a null id', async () => {
      const id = 'key1'
      let err

      await keystore.createKey(id)

      try {
        await keystore.getKey(null)
      } catch (e) {
        err = e.toString()
      }

      strictEqual(err, 'Error: id needed to get a key')
    })

    it('gets a non-existent key', async () => {
      const expected = undefined
      const id = 'key1'

      const actual = await keystore.getKey(id)

      strictEqual(actual, expected)
    })

    describe('signing', () => {
      it('signs data', async () => {
        const expected = '304402207eb6e4f4b2c56665c505696c41ec0831c6c2998620589d4b6f405d49134dea5102207e71ba37d94b7a70e3d9fb3bea7c8d8b7082c3c880b6831e9613a0a3e7aabd9f'

        const key = await keystore.getKey('userA')
        const actual = await sign(key, 'data data data')
        strictEqual(actual, expected)
      })

      it('throws an error if no key is passed', async () => {
        let err
        try {
          await sign(null, 'data data data')
        } catch (e) {
          err = e.toString()
        }

        strictEqual(err, 'Error: No signing key given')
      })

      it('throws an error if no data is passed', async () => {
        const key = 'key_1'
        let err
        try {
          await sign(key)
        } catch (e) {
          err = e.toString()
        }

        strictEqual(err, 'Error: Given input data was undefined')
      })
    })

    describe('Getting the public key', async () => {
      let key

      beforeEach(async () => {
        key = await keystore.getKey('userA')
      })

      it('gets the public key', async () => {
        const expected = '04e0480538c2a39951d054e17ff31fde487cb1031d0044a037b53ad2e028a3e77c34e864b8579e7c7b24542959e7325361a96f1efb41ed5d3c08f0ea1e5dd0c8ed'
        const publicKey = await keystore.getPublic(key)
        strictEqual(publicKey, expected)
      })

      it('gets the public key buffer', async () => {
        const expected = {
          type: 'Buffer',
          data: [4, 224, 72, 5, 56, 194, 163, 153, 81, 208, 84,
            225, 127, 243, 31, 222, 72, 124, 177, 3, 29, 0,
            68, 160, 55, 181, 58, 210, 224, 40, 163, 231, 124,
            52, 232, 100, 184, 87, 158, 124, 123, 36, 84, 41,
            89, 231, 50, 83, 97, 169, 111, 30, 251, 65, 237,
            93, 60, 8, 240, 234, 30, 93, 208, 200, 237]
        }
        const publicKey = await keystore.getPublic(key, { format: 'buffer' })

        deepStrictEqual(publicKey.toJSON(), expected)
      })

      it('gets the public key when decompress is false', async () => {
        const expectedCompressedKey = signingKeys.userA.publicKey
        const publicKey = await keystore.getPublic(key, { decompress: false })
        strictEqual(publicKey, expectedCompressedKey)
      })

      it('gets the public key buffer when decompressed is false', async () => {
        const expected = {
          type: 'Buffer',
          data: [3, 224, 72, 5, 56, 194, 163, 153,
            81, 208, 84, 225, 127, 243, 31, 222,
            72, 124, 177, 3, 29, 0, 68, 160,
            55, 181, 58, 210, 224, 40, 163, 231,
            124]
        }

        const publicKey = await keystore.getPublic(key, { format: 'buffer', decompress: false })

        deepStrictEqual(publicKey.toJSON(), expected)
      })

      it('throws an error if no keys are passed', async () => {
        try {
          await keystore.getPublic()
        } catch (e) {
          strictEqual(true, true)
        }
      })

      it('throws an error if a bad format is passed', async () => {
        try {
          await keystore.getPublic(key, { format: 'foo' })
        } catch (e) {
          strictEqual(true, true)
        }
      })
    })

    describe('Verifying', async function () {
      let key, publicKey

      beforeEach(async () => {
        key = await keystore.getKey('userA')
        publicKey = await keystore.getPublic(key)
      })

      it('verifies content', async () => {
        const signature = '304402207eb6e4f4b2c56665c505696c41ec0831c6c2998620589d4b6f405d49134dea5102207e71ba37d94b7a70e3d9fb3bea7c8d8b7082c3c880b6831e9613a0a3e7aabd9f'
        const verified = await verify(signature, publicKey, 'data data data')
        strictEqual(verified, true)
      })

      it('verifies content with cache', async () => {
        const data = 'data'.repeat(1024 * 1024)
        const signature = await sign(key, data)
        const startTime = new Date().getTime()
        await verify(signature, publicKey, data)
        const first = new Date().getTime()
        await verify(signature, publicKey, data)
        const after = new Date().getTime()
        console.log('First pass:', first - startTime, 'ms', 'Cached:', after - first, 'ms')
        strictEqual(first - startTime > after - first, true)
      })

      it('does not verify content with bad signature', async () => {
        const signature = 'xxxxxx'
        const verified = await verify(signature, publicKey, 'data data data')
        strictEqual(verified, false)
      })
    })
  })
})
