import assert from 'assert'
import path from 'path'
import rmrf from 'rimraf'
import { KeyStore, IdentityProvider } from '../../src/index.js'
import { Identity } from '../../src/identities/index.js'
import { Ed25519Provider } from 'key-did-provider-ed25519'
import KeyDidResolver from 'key-did-resolver'
import DIDIdentityProvider from '../../src/identities/providers/did.js'
const keypath = path.resolve('./test/identies/fixtures/keys')
let keystore

const seed = new Uint8Array([157, 94, 116, 198, 19, 248, 93, 239, 173, 82, 245, 222, 199, 7, 183, 177, 123, 238, 83, 240, 143, 188, 87, 191, 33, 95, 58, 136, 46, 218, 219, 245])
const didStr = 'did:key:z6MkpnTJwrrVuphNh1uKb5DB7eRxvqniVaSDUHU6jtGVmn3r'

const type = DIDIdentityProvider.type
describe('DID Identity Provider', function () {
  before(async () => {
    DIDIdentityProvider.setDIDResolver(KeyDidResolver.getResolver())
    IdentityProvider.addIdentityProvider(DIDIdentityProvider)
    keystore = new KeyStore(keypath)
    await keystore.open()
  })

  after(async () => {
    await keystore.close()
  })

  describe('create an DID identity', () => {
    let identity

    before(async () => {
      const didProvider = new Ed25519Provider(seed)
      identity = await IdentityProvider.createIdentity({ type, keystore, didProvider })
    })

    it('has the correct id', async () => {
      assert.strictEqual(identity.id, didStr)
    })

    it('created a key for id in keystore', async () => {
      const key = await keystore.getKey(didStr)
      assert.notStrictEqual(key, undefined)
    })

    it('has the correct public key', async () => {
      const signingKey = await keystore.getKey(didStr)
      assert.notStrictEqual(signingKey, undefined)
      assert.strictEqual(identity.publicKey, keystore.getPublic(signingKey))
    })

    it('has a signature for the id', async () => {
      const signingKey = await keystore.getKey(didStr)
      const idSignature = await keystore.sign(signingKey, didStr)
      const verifies = await KeyStore.verify(idSignature, identity.publicKey, didStr)
      assert.strictEqual(verifies, true)
      assert.strictEqual(identity.signatures.id, idSignature)
    })

    it('has a signature for the publicKey', async () => {
      const signingKey = await keystore.getKey(didStr)
      const idSignature = await keystore.sign(signingKey, didStr)
      assert.notStrictEqual(idSignature, undefined)
    })
  })

  describe('verify identity', () => {
    let identity

    before(async () => {
      const didProvider = new Ed25519Provider(seed)
      identity = await IdentityProvider.createIdentity({ type, keystore, didProvider })
    })

    it('DID identity verifies', async () => {
      const verified = await IdentityProvider.verifyIdentity(identity)
      assert.strictEqual(verified, true)
    })

    it('DID identity with incorrect id does not verify', async () => {
      const identity2 = new Identity('NotAnId', identity.publicKey, identity.signatures.id, identity.signatures.publicKey, identity.type, identity.provider)
      const verified = await IdentityProvider.verifyIdentity(identity2)
      assert.strictEqual(verified, false)
    })
  })

  describe('sign data with an identity', () => {
    let identity
    const data = 'hello friend'

    before(async () => {
      const didProvider = new Ed25519Provider(seed)
      identity = await IdentityProvider.createIdentity({ type, keystore, didProvider })
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

    describe('verify data signed by an identity', () => {
      const data = 'hello friend'
      let identity
      let signature

      before(async () => {
        const didProvider = new Ed25519Provider(seed)
        identity = await IdentityProvider.createIdentity({ type, keystore, didProvider })
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
    })
  })
})
