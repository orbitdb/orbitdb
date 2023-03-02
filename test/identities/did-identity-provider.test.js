// import assert from 'assert'
// import rmrf from 'rimraf'
// import KeyStore, { signMessage, verifyMessage } from '../../src/key-store.js'
// import Identities, { addIdentityProvider } from '../../src/identities/identities.js'
// import Identity from '../../src/identities/identity.js'
// import { Ed25519Provider } from 'key-did-provider-ed25519'
// import KeyDidResolver from 'key-did-resolver'
// import DIDIdentityProvider from '../../src/identities/providers/did.js'

// const seed = new Uint8Array([157, 94, 116, 198, 19, 248, 93, 239, 173, 82, 245, 222, 199, 7, 183, 177, 123, 238, 83, 240, 143, 188, 87, 191, 33, 95, 58, 136, 46, 218, 219, 245])
// const didStr = 'did:key:z6MkpnTJwrrVuphNh1uKb5DB7eRxvqniVaSDUHU6jtGVmn3r'
// const type = DIDIdentityProvider.type

// describe('DID Identity Provider', function () {
//   let keystore
//   let identities

//   before(async () => {
//     keystore = await KeyStore()
//     DIDIdentityProvider.setDIDResolver(KeyDidResolver.getResolver())
//     addIdentityProvider(DIDIdentityProvider)
//     identities = await Identities({ keystore })
//   })

//   after(async () => {
//     if (keystore) {
//       await keystore.close()
//     }
//     rmrf.sync('./keystore')
//     rmrf.sync('./orbitdb')
//   })

//   describe('create an DID identity', () => {
//     let identity

//     before(async () => {
//       const didProvider = new Ed25519Provider(seed)
//       identity = await identities.createIdentity({ type, keystore, didProvider })
//     })

//     it('has the correct id', async () => {
//       assert.strictEqual(identity.id, didStr)
//     })

//     it('created a key for id in keystore', async () => {
//       const key = await keystore.getKey(didStr)
//       assert.notStrictEqual(key, undefined)
//     })

//     it('has the correct public key', async () => {
//       const signingKey = await keystore.getKey(didStr)
//       assert.notStrictEqual(signingKey, undefined)
//       assert.strictEqual(identity.publicKey, keystore.getPublic(signingKey))
//     })

//     it('has a signature for the id', async () => {
//       const signingKey = await keystore.getKey(didStr)
//       const idSignature = await signMessage(signingKey, didStr)
//       const verifies = await verifyMessage(idSignature, identity.publicKey, didStr)
//       assert.strictEqual(verifies, true)
//       assert.strictEqual(identity.signatures.id, idSignature)
//     })

//     it('has a signature for the publicKey', async () => {
//       const signingKey = await keystore.getKey(didStr)
//       const idSignature = await signMessage(signingKey, didStr)
//       assert.notStrictEqual(idSignature, undefined)
//     })
//   })

//   describe('verify identity', () => {
//     let identity

//     before(async () => {
//       const didProvider = new Ed25519Provider(seed)
//       identity = await identities.createIdentity({ type, keystore, didProvider })
//     })

//     it('DID identity verifies', async () => {
//       const verified = await identities.verifyIdentity(identity)
//       assert.strictEqual(verified, true)
//     })

//     it('DID identity with incorrect id does not verify', async () => {
//       const { publicKey, signatures, type } = identity
//       const identity2 = await Identity({
//         id: 'NotAnId',
//         publicKey,
//         signatures,
//         type
//       })
//       const verified = await identities.verifyIdentity(identity2)
//       assert.strictEqual(verified, false)
//     })
//   })

//   describe('sign data with an identity', () => {
//     let identity
//     const data = 'hello friend'

//     before(async () => {
//       const didProvider = new Ed25519Provider(seed)
//       identity = await identities.createIdentity({ type, keystore, didProvider })
//     })

//     it('sign data', async () => {
//       const signingKey = await keystore.getKey(identity.id)
//       const expectedSignature = await signMessage(signingKey, data)
//       const signature = await identities.sign(identity, data, keystore)
//       assert.strictEqual(signature, expectedSignature)
//     })

//     it('throws an error if private key is not found from keystore', async () => {
//       // Remove the key from the keystore (we're using a mock storage in these tests)
//       const { publicKey, signatures, type } = identity
//       const modifiedIdentity = await Identity({
//         id: 'this id does not exist',
//         publicKey,
//         signatures: {
//           id: '<sig>',
//           publicKey: signatures.publicKey
//         },
//         type
//       })
//       let signature
//       let err
//       try {
//         signature = await identities.sign(modifiedIdentity, data, keystore)
//       } catch (e) {
//         err = e.toString()
//       }
//       assert.strictEqual(signature, undefined)
//       assert.strictEqual(err, 'Error: Private signing key not found from KeyStore')
//     })

//     describe('verify data signed by an identity', () => {
//       const data = 'hello friend'
//       let identity
//       let signature

//       before(async () => {
//         const didProvider = new Ed25519Provider(seed)
//         identity = await identities.createIdentity({ type, keystore, didProvider })
//         signature = await identities.sign(identity, data, keystore)
//       })

//       it('verifies that the signature is valid', async () => {
//         const verified = await identities.verify(signature, identity.publicKey, data)
//         assert.strictEqual(verified, true)
//       })

//       it('doesn\'t verify invalid signature', async () => {
//         const verified = await identities.verify('invalid', identity.publicKey, data)
//         assert.strictEqual(verified, false)
//       })
//     })
//   })
// })
