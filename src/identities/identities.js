/**
 * @module Identities
 * @description
 * Identities provides a framework for generating and managing identity
 * details and providers.
 */
import Identity, { isIdentity, isEqual, decodeIdentity } from './identity.js'
import { getIdentityProvider } from './providers/index.js'
// import DIDIdentityProvider from './identity-providers/did.js'
// import EthIdentityProvider from './identity-providers/ethereum.js'
import KeyStore, { signMessage, verifyMessage } from '../key-store.js'
import { LRUStorage, IPFSBlockStorage, MemoryStorage, ComposedStorage } from '../storage/index.js'
import pathJoin from '../utils/path-join.js'

const DefaultIdentityKeysPath = pathJoin('./orbitdb', 'identities')

/**
 * Creates an instance of Identities.
 * @function
 * @param {Object} params One or more parameters for configuring Identities.
 * @param {module:KeyStore} [params.keystore] A preconfigured KeyStore.
 * A KeyStore will be created in the path defined by the path param. If neither
 * Keystore nor path are defined, a new KeyStore is stored in ./orbitdb
 * identities.
 * @param {string} [params.path] The path to a KeyStore. If no path is
 * provided, the default is ./orbitdb/identities.
 * @param {module:Storage} [params.storage] An instance of a compatible storage
 * module.
 * @param {IPFS} [params.ipfs] An instance of IPFS. This param is not required
 * if storage is provided.
 * @return {module:Identities~Identities} An instance of Identities.
 * @instance
 */
const Identities = async ({ keystore, path, storage, ipfs } = {}) => {
  /**
   * @namespace module:Identities~Identities
   * @description The instance returned by {@link module:Identities}.
   */

  keystore = keystore || await KeyStore({ path: path || DefaultIdentityKeysPath })

  if (!storage) {
    storage = ipfs
      ? await ComposedStorage(await LRUStorage({ size: 1000 }), await IPFSBlockStorage({ ipfs, pin: true }))
      : await MemoryStorage()
  }

  const verifiedIdentitiesCache = await LRUStorage({ size: 1000 })

  /**
   * Gets an identity by hash.
   * @param {string} hash An identity hash.
   * @return {module:Identities~Identity} An instance of identity.
   * @memberof module:Identities~Identities
   * @instance
   */
  const getIdentity = async (hash) => {
    const bytes = await storage.get(hash)
    if (bytes) {
      return decodeIdentity(bytes)
    }
  }

  /**
   * Creates an identity, adding it to storage.
   * @param {Object} options Various options for configuring a new identity.
   * @param {Function} [options.provider=PublicKeyIdentityProvider()] An instance of the Provider to use for generating an identity, e.g. PublicKeyIdentityProvider({ keystore })
   * @return {module:Identities~Identity} An instance of identity.
   * @memberof module:Identities~Identities
   * @instance
   */
  const createIdentity = async (options = {}) => {
    options.keystore = keystore
    const DefaultIdentityProvider = getIdentityProvider('publickey')
    const identityProviderInit = options.provider || DefaultIdentityProvider({ keystore })

    const identityProvider = await identityProviderInit()

    if (!getIdentityProvider(identityProvider.type)) {
      throw new Error('Identity provider is unknown. Use useIdentityProvider(provider) to register the identity provider')
    }

    const id = await identityProvider.getId(options)
    const privateKey = await keystore.getKey(id) || await keystore.createKey(id)
    const publicKey = keystore.getPublic(privateKey)
    const idSignature = await signMessage(privateKey, id)
    const publicKeyAndIdSignature = await identityProvider.signIdentity(publicKey + idSignature, options)
    const signatures = {
      id: idSignature,
      publicKey: publicKeyAndIdSignature
    }

    const identity = await Identity({ id, publicKey, signatures, type: identityProvider.type, sign, verify })

    await storage.put(identity.hash, identity.bytes)

    return identity
  }

  /**
   * Verifies an identity using the identity's provider.
   * @param {module:Identities~Identity} identity The identity to verify.
   * @return {boolean} True the identity is valid, false otherwise.
   * @memberof module:Identities~Identities
   */
  const verifyIdentity = async (identity) => {
    if (!isIdentity(identity)) {
      return false
    }

    const { id, publicKey, signatures } = identity

    const idSignatureVerified = await verify(signatures.id, publicKey, id)
    if (!idSignatureVerified) {
      return false
    }

    const verifiedIdentity = await verifiedIdentitiesCache.get(signatures.id)
    if (verifiedIdentity) {
      return isEqual(identity, verifiedIdentity)
    }

    const Provider = getIdentityProvider(identity.type)

    const identityVerified = await Provider.verifyIdentity(identity)
    if (identityVerified) {
      await verifiedIdentitiesCache.put(signatures.id, identity)
    }

    return identityVerified
  }

  /**
   * Signs data using an identity.
   * @param {module:Identities~Identity} identity The identity to use for
   * signing.
   * @param {string} data The data to sign.
   * @return {string} The signed data.
   * @throws Private signing key not found from KeyStore when no signing key can
   * be retrieved.
   * @memberof module:Identities~Identities
   * @instance
   * @private
   */
  const sign = async (identity, data) => {
    const signingKey = await keystore.getKey(identity.id)

    if (!signingKey) {
      throw new Error('Private signing key not found from KeyStore')
    }

    return await signMessage(signingKey, data)
  }

  /**
   * Verifies data using a valid signature and publicKey.
   * @param {string} signature A signature.
   * @param {string} publicKey A public key.
   * @param {string} data The data to be verified.
   * @return {boolean} True if the the data is signed by the publicKey, false
   * otherwise.
   * @memberof module:Identities~Identities
   * @instance
   * @private
   */
  const verify = async (signature, publicKey, data) => {
    return await verifyMessage(signature, publicKey, data)
  }

  return {
    createIdentity,
    verifyIdentity,
    getIdentity,
    sign,
    verify,
    keystore
  }
}

export {
  Identities as default
}
