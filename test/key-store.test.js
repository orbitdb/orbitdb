import { strictEqual, deepStrictEqual } from 'assert'
import LevelStorage from '../src/storage/level.js'
import LRUStorage from '../src/storage/lru.js'
import ComposedStorage from '../src/storage/composed.js'
import KeyStore, { signMessage, verifyMessage } from '../src/key-store.js'
import { testAPIs } from 'orbit-db-test-utils'
import path from 'path'
import fs from 'fs-extra'
import rmrf from 'rimraf'
import { identityKeys, signingKeys } from './fixtures/orbit-db-identity-keys.js'
import { Identities } from '../src/identities/index.js'
import testKeysPath from './fixtures/test-keys-path.js '

Object.keys(testAPIs).forEach((IPFS) => {
  describe('KeyStore (' + IPFS + ')', () => {
    let keystore

    describe('Creating and retrieving keys', () => {
      beforeEach(async () => {
        keystore = await KeyStore({ path: testKeysPath })
      })

      afterEach(async () => {
        await keystore.close()
      })

      it('creates a key', async () => {
        const id = 'key1'
        await keystore.createKey(id)
        const hasKey = await keystore.hasKey(id)
        strictEqual(hasKey, true)
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
        const id = 'key1234567890'
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
        const id = 'key111111111'

        const actual = await keystore.getKey(id)

        strictEqual(actual, expected)
      })
    })

    describe('Using keys for signing and verifying', () => {
      beforeEach(async () => {
        keystore = await KeyStore({ path: testKeysPath })
        // const identities = await Identities({ keystore })
        // const a = await identities.createIdentity({ id: 'userA' })
        // const b = await identities.createIdentity({ id: 'userB' })
        // const c = await identities.createIdentity({ id: 'userC' })
        // const d = await identities.createIdentity({ id: 'userD' })
        // const x = await identities.createIdentity({ id: 'userX' })
      })

      afterEach(async () => {
        await keystore.close()
      })

      describe('Signing', () => {
        it('signs data', async () => {
          const expected = '3045022100df961fa46bb8a3cb92594a24205e6008a84daa563ac3530f583bb9f9cef5af3b02207b84c5d63387d0a710e42e05785fbccdaf2534c8ed16adb8afd57c3eba930529'

          const key = await keystore.getKey('userA')
          const actual = await signMessage(key, 'data data data')
          strictEqual(actual, expected)
        })

        it('throws an error if no key is passed', async () => {
          let err
          try {
            await signMessage(null, 'data data data')
          } catch (e) {
            err = e.toString()
          }

          strictEqual(err, 'Error: No signing key given')
        })

        it('throws an error if no data is passed', async () => {
          const key = 'key_1'
          let err
          try {
            await signMessage(key)
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
          const expected = '04e7247a4c155b63d182a23c70cb6fe8ba2e44bc9e9d62dc45d4c4167ccde95944f13db3c707da2ee0e3fd6ba531caef9f86eb79132023786cd6139ec5ebed4fae'
          const publicKey = await keystore.getPublic(key)
          strictEqual(publicKey, expected)
        })

        it('gets the public key buffer', async () => {
          const expected = {
            type: 'Buffer',
            data: [
              4, 231,  36, 122,  76,  21,  91,  99, 209, 130, 162,
     60, 112, 203, 111, 232, 186,  46,  68, 188, 158, 157,
     98, 220,  69, 212, 196,  22, 124, 205, 233,  89,  68,
    241,  61, 179, 199,   7, 218,  46, 224, 227, 253, 107,
    165,  49, 202, 239, 159, 134, 235, 121,  19,  32,  35,
    120, 108, 214,  19, 158, 197, 235, 237,  79, 174
            ]
          }
          const publicKey = await keystore.getPublic(key, { format: 'buffer' })

          deepStrictEqual(publicKey.toJSON(), expected)
        })

        it('gets the public key when decompress is false', async () => {
          // const expectedCompressedKey = signingKeys.userA.publicKey
          const expectedCompressedKey = '02e7247a4c155b63d182a23c70cb6fe8ba2e44bc9e9d62dc45d4c4167ccde95944'
          const publicKey = await keystore.getPublic(key, { decompress: false })
          strictEqual(publicKey, expectedCompressedKey)
        })

        it('gets the public key buffer when decompressed is false', async () => {
          const expected = {
            type: 'Buffer',
            data: [
              2, 231,  36, 122,  76,  21,  91,  99,
    209, 130, 162,  60, 112, 203, 111, 232,
    186,  46,  68, 188, 158, 157,  98, 220,
     69, 212, 196,  22, 124, 205, 233,  89,
     68
            ]
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
          const signature = await signMessage(key, 'data data data')
          const expectedSignature = '3045022100df961fa46bb8a3cb92594a24205e6008a84daa563ac3530f583bb9f9cef5af3b02207b84c5d63387d0a710e42e05785fbccdaf2534c8ed16adb8afd57c3eba930529'
          strictEqual(expectedSignature, signature)

          const verified = await verifyMessage(expectedSignature, publicKey, 'data data data')
          strictEqual(verified, true)
        })

        it('verifies content with cache', async () => {
          const data = 'data'.repeat(1024 * 1024)
          const signature = await signMessage(key, data)
          const startTime = new Date().getTime()
          await verifyMessage(signature, publicKey, data)
          const first = new Date().getTime()
          await verifyMessage(signature, publicKey, data)
          const after = new Date().getTime()
          console.log('First pass:', first - startTime, 'ms', 'Cached:', after - first, 'ms')
          strictEqual(first - startTime > after - first, true)
        })

        it('does not verify content with bad signature', async () => {
          const signature = 'xxxxxx'
          const verified = await verifyMessage(signature, publicKey, 'data data data')
          strictEqual(verified, false)
        })
      })
    })
  })
})
