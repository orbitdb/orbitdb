import assert from 'assert'
import rmrf from 'rimraf'
import { copy } from 'fs-extra'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import KeyStore, { signMessage, verifyMessage } from '../../src/key-store.js'
import { Identities, addIdentityProvider, Identity, PublicKeyIdentityProvider } from '../../src/identities/index.js'
import testKeysPath from '../fixtures/test-keys-path.js'

const type = PublicKeyIdentityProvider.type
const keysPath = './testkeys'

describe('Identities', function () {
  before(async () => {
    await copy(testKeysPath, keysPath)
  })

  after(async () => {
    await rmrf(keysPath)
  })

  describe('Creating Identities', () => {
    const id = 'userA'

    let identities
    let identity

    afterEach(async () => {
      if (identities) {
        await identities.keystore.close()
      }
    })

    it('has the correct id', async () => {
      identities = await Identities({ path: keysPath })
      identity = await identities.createIdentity({ id })
      const key = await identities.keystore.getKey(id)
      const externalId = uint8ArrayToString(key.public.marshal(), 'base16')
      assert.strictEqual(identity.id, externalId)
    })
  })

  describe('Get Identity', () => {
    const id = 'userA'

    let identities
    let identity

    afterEach(async () => {
      if (identities) {
        await identities.keystore.close()
      }
    })

    it('gets the identity from storage', async () => {
      identities = await Identities({ path: keysPath })
      identity = await identities.createIdentity({ id })
      const result = await identities.getIdentity(identity.hash)
      assert.strictEqual(result.id, identity.id)
      assert.strictEqual(result.hash, identity.hash)
      assert.strictEqual(result.publicKey, identity.publicKey)
      assert.strictEqual(result.type, identity.type)
      assert.deepStrictEqual(result.signatures, identity.signatures)
      assert.strictEqual(result.sign, undefined)
      assert.strictEqual(result.verify, undefined)
    })
  })

  describe.skip('Passing in custom keystore', async () => {
    const id = 'userB'

    let identity
    let identities
    let keystore

    before(async () => {
      keystore = await KeyStore({ path: keysPath })
      identities = await Identities({ keystore })
    })

    after(async () => {
      if (keystore) {
        await keystore.close()
      }
    })

    it('has the correct id', async () => {
      identity = await identities.createIdentity({ id })
      keystore = identities.keystore
      const key = await keystore.getKey(id)
      const externalId = uint8ArrayToString(key.public.marshal(), 'base16')
      assert.strictEqual(identity.id, externalId)
    })

    it('created a key for id in identity-keystore', async () => {
      const key = await keystore.getKey(id)
      assert.notStrictEqual(key, undefined)
    })

    it('has the correct public key', async () => {
      const key = await keystore.getKey(id)
      const externalId = uint8ArrayToString(key.public.marshal(), 'base16')
      const signingKey = await keystore.getKey(externalId)
      assert.notStrictEqual(signingKey, undefined)
      assert.strictEqual(identity.publicKey, keystore.getPublic(signingKey))
    })

    it('has a signature for the id', async () => {
      const key = await keystore.getKey(id)
      const externalId = uint8ArrayToString(key.public.marshal(), 'base16')
      const signingKey = await keystore.getKey(externalId)
      const idSignature = await signMessage(signingKey, externalId)
      const publicKey = uint8ArrayToString(signingKey.public.marshal(), 'base16')
      const verifies = await verifyMessage(idSignature, publicKey, externalId)
      assert.strictEqual(verifies, true)
      assert.strictEqual(identity.signatures.id, idSignature)
    })

    it('has a signature for the publicKey', async () => {
      const key = await keystore.getKey(id)
      const externalId = uint8ArrayToString(key.public.marshal(), 'base16')
      const signingKey = await keystore.getKey(externalId)
      const idSignature = await signMessage(signingKey, externalId)
      const externalKey = await keystore.getKey(id)
      const publicKeyAndIdSignature = await signMessage(externalKey, identity.publicKey + idSignature)
      assert.strictEqual(identity.signatures.publicKey, publicKeyAndIdSignature)
    })
  })

  describe('create an identity with saved keys', () => {
    const id = 'userX'

    const expectedPublicKey = '0342fa42a69135eade1e37ea520bc8ee9e240efd62cb0edf0516b21258b4eae656'
    const expectedIdSignature = '3044022068b4bc360d127e39164fbc3b5184f5bd79cc5976286f793d9b38d1f2818e0259022027b875dc8c73635b32db72177b9922038ec4b1eabc8f1fd0919806b0b2519419'
    const expectedPkIdSignature = '30440220464cd4a6202dae2d2fb75b47afc7cceafa6b13c310efabbbdaaf38e67f74188b02201bbef8c97b741b4bb9e3e5362edfcd2eb6fe3b93f4e68e5870fcc345a850f366'

    let identities
    let identity
    let savedKeysKeyStore

    before(async () => {
      savedKeysKeyStore = await KeyStore({ path: keysPath })

      identities = await Identities({ keystore: savedKeysKeyStore })
      identity = await identities.createIdentity({ id })
    })

    after(async () => {
      if (savedKeysKeyStore) {
        await savedKeysKeyStore.close()
      }
    })

    it('has the correct id', async () => {
      const key = await savedKeysKeyStore.getKey(id)
      assert.strictEqual(identity.id, uint8ArrayToString(key.public.marshal(), 'base16'))
    })

    it('has the correct public key', async () => {
      assert.strictEqual(identity.publicKey, expectedPublicKey)
    })

    it('has the correct identity type', async () => {
      assert.strictEqual(identity.type, type)
    })

    it('has the correct idSignature', async () => {
      assert.strictEqual(identity.signatures.id, expectedIdSignature)
    })

    it('has a publicKeyAndIdSignature for the publicKey', async () => {
      assert.strictEqual(identity.signatures.publicKey, expectedPkIdSignature)
    })

    it('has the correct signatures', async () => {
      const internalSigningKey = await savedKeysKeyStore.getKey(identity.id)
      const externalSigningKey = await savedKeysKeyStore.getKey(id)
      const idSignature = await signMessage(internalSigningKey, identity.id)
      const publicKeyAndIdSignature = await signMessage(externalSigningKey, identity.publicKey + idSignature)
      const expectedSignature = { id: idSignature, publicKey: publicKeyAndIdSignature }
      assert.deepStrictEqual(identity.signatures, expectedSignature)
    })
  })

  describe('verify identity\'s signature', () => {
    const id = 'QmFoo'

    let identities
    let identity
    let keystore

    before(async () => {
      keystore = await KeyStore({ path: keysPath })
    })

    after(async () => {
      if (keystore) {
        await keystore.close()
      }
    })

    it('identity pkSignature verifies', async () => {
      identities = await Identities({ keystore })
      identity = await identities.createIdentity({ id, type })
      const verified = await verifyMessage(identity.signatures.id, identity.publicKey, identity.id)
      assert.strictEqual(verified, true)
    })

    it('identity signature verifies', async () => {
      identities = await Identities({ keystore })
      identity = await identities.createIdentity({ id, type })
      const verified = await verifyMessage(identity.signatures.publicKey, identity.id, identity.publicKey + identity.signatures.id)
      assert.strictEqual(verified, true)
    })

    it('false signature doesn\'t verify', async () => {
      class IP {
        async getId () { return 'pubKey' }

        async signIdentity (data) { return `false signature '${data}'` }

        static async verifyIdentity (data) { return false }

        static get type () { return 'fake' }
      }

      addIdentityProvider(IP)
      identity = await identities.createIdentity({ type: IP.type })
      const verified = await identities.verifyIdentity(identity)
      assert.strictEqual(verified, false)
    })
  })

  describe('verify identity', () => {
    const id = 'QmFoo'

    let identities
    let identity
    let keystore

    before(async () => {
      keystore = await KeyStore({ path: keysPath })
      identities = await Identities({ keystore })
    })

    after(async () => {
      if (keystore) {
        await keystore.close()
      }
    })

    it('identity verifies', async () => {
      identity = await identities.createIdentity({ id, type })
      const verified = await identities.verifyIdentity(identity)
      assert.strictEqual(verified, true)
    })
  })

  describe('sign data with an identity', () => {
    const id = '0x01234567890abcdefghijklmnopqrstuvwxyz'
    const data = 'hello friend'

    let identities
    let identity
    let keystore

    before(async () => {
      keystore = await KeyStore({ path: keysPath })
      identities = await Identities({ keystore })
      identity = await identities.createIdentity({ id })
    })

    after(async () => {
      if (keystore) {
        await keystore.close()
      }
    })

    it('sign data', async () => {
      const signingKey = await keystore.getKey(identity.id)
      const expectedSignature = await signMessage(signingKey, data)
      const signature = await identities.sign(identity, data, keystore)
      assert.strictEqual(signature, expectedSignature)
    })

    it('throws an error if private key is not found from keystore', async () => {
      // Remove the key from the keystore (we're using a mock storage in these tests)
      const { publicKey, signatures, type } = identity
      const modifiedIdentity = await Identity({ id: 'this id does not exist', publicKey, signatures, type })
      let signature
      let err
      try {
        signature = await identities.sign(modifiedIdentity, data, keystore)
      } catch (e) {
        err = e.toString()
      }
      assert.strictEqual(signature, undefined)
      assert.strictEqual(err, 'Error: Private signing key not found from KeyStore')
    })
  })

  describe('verify data signed by an identity', () => {
    const id = '03602a3da3eb35f1148e8028f141ec415ef7f6d4103443edbfec2a0711d716f53f'
    const data = 'hello friend'

    let identities
    let identity
    let keystore
    let signature

    before(async () => {
      keystore = await KeyStore({ path: keysPath })
    })

    after(async () => {
      if (keystore) {
        await keystore.close()
      }
    })

    beforeEach(async () => {
      identities = await Identities({ keystore })
      identity = await identities.createIdentity({ id, type })
      signature = await identities.sign(identity, data, keystore)
    })

    it('verifies that the signature is valid', async () => {
      const verified = await identities.verify(signature, identity.publicKey, data)
      assert.strictEqual(verified, true)
    })

    it('doesn\'t verify invalid signature', async () => {
      const verified = await identities.verify('invalid', identity.publicKey, data)
      assert.strictEqual(verified, false)
    })
  })
})
