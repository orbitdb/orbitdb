import assert from 'assert'
import path from 'path'
import rmrf from 'rimraf'
import { KeyStore, Identities } from '../../src/index.js'
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

  describe('Creating Identities', () => {
    const id = 'A'

    let identities
    let identity

    afterEach(async () => {
      if (identities) {
        await identities.keystore.close()
      }
      if (identities) {
        await identities.signingKeyStore.close()
      }
    })

    it('identityKeysPath only - has the correct id', async () => {
      identities = await Identities({ identityKeysPath })
      identity = await identities.createIdentity({ id })
      const key = await identities.keystore.getKey(id)
      const externalId = Buffer.from(key.public.marshal()).toString('hex')
      assert.strictEqual(identity.id, externalId)
    })

    it('identityKeysPath and signingKeysPath - has a different id', async () => {
      identities = await Identities({ identityKeysPath, signingKeysPath })
      identity = await identities.createIdentity({ id })
      const key = await identities.keystore.getKey(id)
      const externalId = Buffer.from(key.public.marshal()).toString('hex')
      assert.notStrictEqual(identity.id, externalId)
    })
  })

  describe('Passing in custom keystore', async () => {
    const id = 'B'

    let identity
    let identities
    let keystore
    let signingKeyStore

    before(async () => {
      keystore = new KeyStore(identityKeysPath)
      await keystore.open()
      signingKeyStore = new KeyStore(signingKeysPath)
      await signingKeyStore.open()
      identities = await Identities({ keystore })
    })

    after(async () => {
      if (keystore) {
        await keystore.close()
      }
      if (signingKeyStore) {
        await signingKeyStore.close()
      }
    })

    it('has the correct id', async () => {
      identity = await identities.createIdentity({ id })
      keystore = identities.keystore
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
      const idSignature = await KeyStore.sign(signingKey, externalId)
      const publicKey = Buffer.from(signingKey.public.marshal()).toString('hex')
      const verifies = await KeyStore.verify(idSignature, publicKey, externalId)
      assert.strictEqual(verifies, true)
      assert.strictEqual(identity.signatures.id, idSignature)
    })

    it('has a signature for the publicKey', async () => {
      const key = await keystore.getKey(id)
      const externalId = Buffer.from(key.public.marshal()).toString('hex')
      const signingKey = await keystore.getKey(externalId)
      const idSignature = await KeyStore.sign(signingKey, externalId)
      const externalKey = await keystore.getKey(id)
      const publicKeyAndIdSignature = await KeyStore.sign(externalKey, identity.publicKey + idSignature)
      assert.strictEqual(identity.signatures.publicKey, publicKeyAndIdSignature)
    })
  })

  describe('create an identity with saved keys', () => {
    const id = 'QmPhnEjVkYE1Ym7F5MkRUfkD6NtuSptE7ugu1Ggr149W2X'

    const expectedPublicKey = '040d78ff62afb656ac62db1aae3b1536a614991e28bb4d721498898b7d4194339640cd18c37b259e2c77738de0d6f9a5d52e0b936611de6b6ba78891a8b2a38317'
    const expectedIdSignature = '30450221009de7b91952d73f577e85962aa6301350865212e3956862f80f4ebb626ffc126b022027d57415fb145b7e06cf06320fbfa63ea98a958b065726fe86eaab809a6bf607'
    const expectedPkIdSignature = '304402202806e7c2406ca1f35961d38adc3997c179e142d54e1ca838ace373fae27124fd02200d6ca3aea6e1341bf5e4e0b84b559bbeefecfade34115de266a69d04d924905e'

    let identities
    let identity
    let savedKeysKeyStore

    before(async () => {
      await fs.copy(fixturesPath, savedKeysPath)

      savedKeysKeyStore = new KeyStore(savedKeysPath)
      await savedKeysKeyStore.open()

      identities = await Identities({ keystore: savedKeysKeyStore })
      identity = await identities.createIdentity({ id })
    })


    after(async () => {
      if (identities) {
        await identities.keystore.close()
      }
      if (identities) {
        await identities.signingKeyStore.close()
      }
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
      const idSignature = await KeyStore.sign(internalSigningKey, identity.id)
      const pubKeyIdSignature = await KeyStore.sign(externalSigningKey, identity.publicKey + idSignature)
      const expectedSignature = { id: idSignature, publicKey: pubKeyIdSignature }
      assert.deepStrictEqual(identity.signatures, expectedSignature)
    })
  })

  describe('verify identity\'s signature', () => {
    const id = 'QmFoo'

    let identities
    let identity
    let keystore
    let signingKeyStore

    before(async () => {
      keystore = new KeyStore(identityKeysPath)
      await keystore.open()
      signingKeyStore = new KeyStore(signingKeysPath)
      await signingKeyStore.open()
    })

    after(async () => {
      if (keystore) {
        await keystore.close()
      }
      if (signingKeyStore) {
        await signingKeyStore.close()
      }
    })

    it('identity pkSignature verifies', async () => {
      identities = await Identities({ keystore, signingKeyStore })
      identity = await identities.createIdentity({ id, type })
      const verified = await KeyStore.verify(identity.signatures.id, identity.publicKey, identity.id)
      assert.strictEqual(verified, true)
    })

    it('identity signature verifies', async () => {
      identities = await Identities({ keystore, signingKeyStore })
      identity = await identities.createIdentity({ id, type })
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

      identities.addIdentityProvider(IP)
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
    let signingKeyStore

    before(async () => {
      keystore = new KeyStore(identityKeysPath)
      await keystore.open()
      signingKeyStore = new KeyStore(signingKeysPath)
      await signingKeyStore.open()
      identities = await Identities({ keystore, signingKeyStore })
    })

    after(async () => {
      if (keystore) {
        await keystore.close()
      }
      if (signingKeyStore) {
        await signingKeyStore.close()
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
    let signingKeyStore

    before(async () => {
      keystore = new KeyStore(identityKeysPath)
      await keystore.open()
      signingKeyStore = new KeyStore(signingKeysPath)
      await signingKeyStore.open()
      identities = await Identities({ keystore, signingKeyStore })
      identity = await identities.createIdentity({ id })
    })

    after(async () => {
      if (keystore) {
        await keystore.close()
      }
      if (signingKeyStore) {
        await signingKeyStore.close()
      }
    })

    it('sign data', async () => {
      const signingKey = await keystore.getKey(identity.id)
      const expectedSignature = await KeyStore.sign(signingKey, data)
      const signature = await identities.sign(identity, data, keystore)
      assert.strictEqual(signature, expectedSignature)
    })

    it('throws an error if private key is not found from keystore', async () => {
      // Remove the key from the keystore (we're using a mock storage in these tests)
      const modifiedIdentity = new Identity('this id does not exist', identity.publicKey, '<sig>', identity.signatures, identity.type)
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
    let signingKeyStore
    let signature

    before(async () => {
      keystore = new KeyStore(identityKeysPath)
      await keystore.open()
      signingKeyStore = new KeyStore(signingKeysPath)
      await signingKeyStore.open()
    })

    after(async () => {
      if (keystore) {
        await keystore.close()
      }
      if (signingKeyStore) {
        await signingKeyStore.close()
      }
    })

    beforeEach(async () => {
      identities = await Identities({ keystore, signingKeyStore })
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
