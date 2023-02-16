import assert from 'assert'
import path from 'path'
import rmrf from 'rimraf'
import { KeyStore, IdentityProvider } from '../../src/index.js'
import { Identity } from '../../src/identities/index.js'
import fs from 'fs-extra'
const fixturesPath = path.resolve('./test/identities/fixtures/keys')
const savedKeysPath = path.resolve('./test/identities/fixtures/savedKeys')
const signingKeysPath = path.resolve('./test/identities/signingKeys')
const identityKeysPath = path.resolve('./test/identities/identityKeys')
const type = 'orbitdb'

describe('Identity Provider', function () {
  before(async () => {
    rmrf.sync(signingKeysPath)
    rmrf.sync(identityKeysPath)
  })

  after(async () => {
    rmrf.sync(signingKeysPath)
    rmrf.sync(identityKeysPath)
  })

  describe('Creating IdentityProvider', () => {
    const id = 'A'
    let identity

    it('identityKeysPath only - has the correct id', async () => {
      identity = await IdentityProvider.createIdentity({ id, identityKeysPath })
      const key = await identity.provider.keystore.getKey(id)
      const externalId = Buffer.from(key.public.marshal()).toString('hex')
      assert.strictEqual(identity.id, externalId)
    })

    it('identityKeysPath and signingKeysPath - has a different id', async () => {
      identity = await IdentityProvider.createIdentity({ id, identityKeysPath, signingKeysPath })
      const key = await identity.provider.keystore.getKey(id)
      const externalId = Buffer.from(key.public.marshal()).toString('hex')
      assert.notStrictEqual(identity.id, externalId)
    })

    afterEach(async () => {
      await identity.provider.keystore.close()
      await identity.provider.signingKeyStore.close()
    })
  })

  describe('Passing in custom keystore', async () => {
    const id = 'B'; let identity; let keystore; let signingKeyStore

    before(async () => {
      keystore = new KeyStore(identityKeysPath)
      await keystore.open()
      signingKeyStore = new KeyStore(signingKeysPath)
      await signingKeyStore.open()
    })

    it('has the correct id', async () => {
      identity = await IdentityProvider.createIdentity({ id, keystore })
      keystore = identity.provider._keystore
      const key = await keystore.getKey(id)
      const externalId = Buffer.from(key.public.marshal()).toString('hex')
      assert.strictEqual(identity.id, externalId)
    })


    it('created a key for id in identity-keystore', async () => {
      const key = await keystore.getKey(id)
      assert.notStrictEqual(key, undefined)
    })

    it('has the correct public key', async () => {
      const key = await keystore.getKey(id)
      const externalId = Buffer.from(key.public.marshal()).toString('hex')
      const signingKey = await keystore.getKey(externalId)
      assert.notStrictEqual(signingKey, undefined)
      assert.strictEqual(identity.publicKey, keystore.getPublic(signingKey))
    })

    it('has a signature for the id', async () => {
      const key = await keystore.getKey(id)
      const externalId = Buffer.from(key.public.marshal()).toString('hex')
      const signingKey = await keystore.getKey(externalId)
      const idSignature = await keystore.sign(signingKey, externalId)
      const publicKey = Buffer.from(signingKey.public.marshal()).toString('hex')
      const verifies = await KeyStore.verify(idSignature, publicKey, externalId)
      assert.strictEqual(verifies, true)
      assert.strictEqual(identity.signatures.id, idSignature)
    })

    it('has a signature for the publicKey', async () => {
      const key = await keystore.getKey(id)
      const externalId = Buffer.from(key.public.marshal()).toString('hex')
      const signingKey = await keystore.getKey(externalId)
      const idSignature = await keystore.sign(signingKey, externalId)
      const externalKey = await keystore.getKey(id)
      const publicKeyAndIdSignature = await keystore.sign(externalKey, identity.publicKey + idSignature)
      assert.strictEqual(identity.signatures.publicKey, publicKeyAndIdSignature)
    })

    after(async () => {
      await keystore.close()
      await signingKeyStore.close()
    })
  })

  describe('create an identity with saved keys', () => {
    let keystore, signingKeyStore

    let savedKeysKeyStore, identity
    const id = 'QmPhnEjVkYE1Ym7F5MkRUfkD6NtuSptE7ugu1Ggr149W2X'

    const expectedPublicKey = '040d78ff62afb656ac62db1aae3b1536a614991e28bb4d721498898b7d4194339640cd18c37b259e2c77738de0d6f9a5d52e0b936611de6b6ba78891a8b2a38317'
    const expectedIdSignature = '30450221009de7b91952d73f577e85962aa6301350865212e3956862f80f4ebb626ffc126b022027d57415fb145b7e06cf06320fbfa63ea98a958b065726fe86eaab809a6bf607'
    const expectedPkIdSignature = '304402202806e7c2406ca1f35961d38adc3997c179e142d54e1ca838ace373fae27124fd02200d6ca3aea6e1341bf5e4e0b84b559bbeefecfade34115de266a69d04d924905e'

    before(async () => {
      keystore = new KeyStore(identityKeysPath)
      await keystore.open()
      signingKeyStore = new KeyStore(signingKeysPath)
      await signingKeyStore.open()

      await fs.copy(fixturesPath, savedKeysPath)
      savedKeysKeyStore = new KeyStore(savedKeysPath)
      await savedKeysKeyStore.open()
      identity = await IdentityProvider.createIdentity({ id, keystore: savedKeysKeyStore })
    })

    after(async () => {
      rmrf.sync(savedKeysPath)
    })

    it('has the correct id', async () => {
      const key = await savedKeysKeyStore.getKey(id)
      assert.strictEqual(identity.id, Buffer.from(key.public.marshal()).toString('hex'))
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

    it('has a pubKeyIdSignature for the publicKey', async () => {
      assert.strictEqual(identity.signatures.publicKey, expectedPkIdSignature)
    })

    it('has the correct signatures', async () => {
      const internalSigningKey = await savedKeysKeyStore.getKey(identity.id)
      const externalSigningKey = await savedKeysKeyStore.getKey(id)
      const idSignature = await savedKeysKeyStore.sign(internalSigningKey, identity.id)
      const pubKeyIdSignature = await savedKeysKeyStore.sign(externalSigningKey, identity.publicKey + idSignature)
      const expectedSignature = { id: idSignature, publicKey: pubKeyIdSignature }
      assert.deepStrictEqual(identity.signatures, expectedSignature)
    })

    after(async () => {
      await keystore.close()
      await signingKeyStore.close()
    })
  })

  describe('verify identity\'s signature', () => {
    const id = 'QmFoo'
    let identity, keystore, signingKeyStore

    before(async () => {
      keystore = new KeyStore(identityKeysPath)
      await keystore.open()
      signingKeyStore = new KeyStore(signingKeysPath)
      await signingKeyStore.open()
    })

    it('identity pkSignature verifies', async () => {
      identity = await IdentityProvider.createIdentity({ id, type, keystore, signingKeyStore })
      const verified = await KeyStore.verify(identity.signatures.id, identity.publicKey, identity.id)
      assert.strictEqual(verified, true)
    })

    it('identity signature verifies', async () => {
      identity = await IdentityProvider.createIdentity({ id, type, keystore, signingKeyStore })
      const verified = await KeyStore.verify(identity.signatures.publicKey, identity.id, identity.publicKey + identity.signatures.id)
      assert.strictEqual(verified, true)
    })

    it('false signature doesn\'t verify', async () => {
      class IP {
        async getId () { return 'pubKey' }

        async signIdentity (data) { return `false signature '${data}'` }

        static async verifyIdentity (data) { return false }

        static get type () { return 'fake' }
      }

      IdentityProvider.addIdentityProvider(IP)
      identity = await IdentityProvider.createIdentity({ type: IP.type, keystore, signingKeyStore })
      const verified = await IdentityProvider.verifyIdentity(identity)
      assert.strictEqual(verified, false)
    })

    after(async () => {
      await keystore.close()
      await signingKeyStore.close()
    })
  })

  describe('verify identity', () => {
    const id = 'QmFoo'
    let identity, keystore, signingKeyStore

    before(async () => {
      keystore = new KeyStore(identityKeysPath)
      await keystore.open()
      signingKeyStore = new KeyStore(signingKeysPath)
      await signingKeyStore.open()
    })

    it('identity verifies', async () => {
      identity = await IdentityProvider.createIdentity({ id, type, keystore, signingKeyStore })
      const verified = await identity.provider.verifyIdentity(identity)
      assert.strictEqual(verified, true)
    })

    after(async () => {
      await keystore.close()
      await signingKeyStore.close()
    })
  })

  describe('sign data with an identity', () => {
    const id = '0x01234567890abcdefghijklmnopqrstuvwxyz'
    const data = 'hello friend'
    let identity, keystore, signingKeyStore

    before(async () => {
      keystore = new KeyStore(identityKeysPath)
      await keystore.open()
      signingKeyStore = new KeyStore(signingKeysPath)
      await signingKeyStore.open()
      identity = await IdentityProvider.createIdentity({ id, keystore, signingKeyStore })
    })

    it('sign data', async () => {
      const signingKey = await keystore.getKey(identity.id)
      const expectedSignature = await keystore.sign(signingKey, data)
      const signature = await identity.provider.sign(identity, data, keystore)
      assert.strictEqual(signature, expectedSignature)
    })

    it('throws an error if private key is not found from keystore', async () => {
      // Remove the key from the keystore (we're using a mock storage in these tests)
      const modifiedIdentity = new Identity('this id does not exist', identity.publicKey, '<sig>', identity.signatures, identity.type, identity.provider)
      let signature
      let err
      try {
        signature = await identity.provider.sign(modifiedIdentity, data, keystore)
      } catch (e) {
        err = e.toString()
      }
      assert.strictEqual(signature, undefined)
      assert.strictEqual(err, 'Error: Private signing key not found from KeyStore')
    })

    after(async () => {
      await keystore.close()
      await signingKeyStore.close()
    })
  })

  describe('verify data signed by an identity', () => {
    const id = '03602a3da3eb35f1148e8028f141ec415ef7f6d4103443edbfec2a0711d716f53f'
    const data = 'hello friend'
    let identity, keystore, signingKeyStore
    let signature

    before(async () => {
      keystore = new KeyStore(identityKeysPath)
      await keystore.open()
      signingKeyStore = new KeyStore(signingKeysPath)
      await signingKeyStore.open()
    })

    beforeEach(async () => {
      identity = await IdentityProvider.createIdentity({ id, type, keystore, signingKeyStore })
      signature = await identity.provider.sign(identity, data, keystore)
    })

    it('verifies that the signature is valid', async () => {
      const verified = await identity.provider.verify(signature, identity.publicKey, data)
      assert.strictEqual(verified, true)
    })

    it('doesn\'t verify invalid signature', async () => {
      const verified = await identity.provider.verify('invalid', identity.publicKey, data)
      assert.strictEqual(verified, false)
    })

    after(async () => {
      await keystore.close()
      await signingKeyStore.close()
    })
  })
})
