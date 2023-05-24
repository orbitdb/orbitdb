/**
 * @module Identities
 * @description
 * Identities provides a framework for generating and managing identity
 * details and providers.
 */

import Identity, { isIdentity, isEqual, decodeIdentity } from './identity.js'
import { PublicKeyIdentityProvider } from './providers/index.js'
// import DIDIdentityProvider from './identity-providers/did.js'
// import EthIdentityProvider from './identity-providers/ethereum.js'
import KeyStore, { signMessage, verifyMessage } from '../key-store.js'
import { LRUStorage, IPFSBlockStorage, MemoryStorage, ComposedStorage } from '../storage/index.js'
import pathJoin from '../utils/path-join.js'

const DefaultProviderType = 'publickey'
const DefaultIdentityKeysPath = pathJoin('./orbitdb', 'identities')

const supportedTypes = {
  publickey: PublicKeyIdentityProvider
  // [DIDIdentityProvider.type]: DIDIdentityProvider,
  // [EthIdentityProvider.type]: EthIdentityProvider
}

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
   * @description The instance returned by {@link module:Identities~Identities}.
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
   * @return {Identity} An instance of identity.
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
   * @param {string} [options.type=publickey] The type of provider to use for generating an identity.
   * @return {Identity} An instance of identity.
   * @memberof module:Identities~Identities
   * @instance
   */
  const createIdentity = async (options = {}) => {
    options.keystore = keystore

    const type = options.type || DefaultProviderType
    const Provider = getProviderFor(type).default
    const identityProvider = Provider(options)
    const id = await identityProvider.getId(options)
    const privateKey = await keystore.getKey(id) || await keystore.createKey(id)
    const publicKey = keystore.getPublic(privateKey)
    const idSignature = await signMessage(privateKey, id)
    const publicKeyAndIdSignature = await identityProvider.signIdentity(publicKey + idSignature, options)
    const signatures = {
      id: idSignature,
      publicKey: publicKeyAndIdSignature
    }

    const identity = await Identity({ id, publicKey, signatures, type, sign, verify })

    await storage.put(identity.hash, identity.bytes)

    return identity
  }

  /**
   * Verifies an identity using the identity's provider.
   * @param {Identity} identity The identity to verify.
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

    const Provider = getProviderFor(identity.type)

    const identityVerified = await Provider.verifyIdentity(identity)
    if (identityVerified) {
      await verifiedIdentitiesCache.put(signatures.id, identity)
    }

    return identityVerified
  }

  /**
   * Signs data using an identity.
   * @param {Identity} identity The identity to use for signing.
   * @param {string} data The data to sign.
   * @return {string} The signed data.
   * @throws Private signing key not fund from KeyStore when no signing key can
   * be retrieved.
   * @memberof module:Identities~Identities
   * @instance
   */
  const sign = async (identity, data) => {
    const signingKey = await keystore.getKey(identity.id)

    if (!signingKey) {
      throw new Error('Private signing key not found from KeyStore')
    }

    return await signMessage(signingKey, data)
  }

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

/**
 * Checks whether an identity provider is supported.
 * @param {string} type The identity provider type.
 * @return {boolean} True if the identity provider is supported, false
 * otherwise.
 * @static
 */
const isProviderSupported = (type) => {
  return Object.keys(supportedTypes).includes(type)
}

/**
 * Gets an identity provider.
 * @param {string} type The identity provider type.
 * @return {IdentityProvider} The IdentityProvider module corresponding to
 * type.
 * @throws IdentityProvider type is not supported if the identity provider is
 * not supported.
 * @static
 */
const getProviderFor = (type) => {
  if (!isProviderSupported(type)) {
    throw new Error(`IdentityProvider type '${type}' is not supported`)
  }

  return supportedTypes[type]
}

/**
 * Adds an identity provider.
 * @param {IdentityProvider} IdentityProvider The identity provider to add.
 * @throws IdentityProvider must be given as an argument if no module is
 * provided.
 * @throws 'Given IdentityProvider doesn't have a field 'type' if the
 * IdentityProvider does not include a type property.
 * @static
 */
const addIdentityProvider = (IdentityProvider) => {
  if (!IdentityProvider) {
    throw new Error('IdentityProvider must be given as an argument')
  }

  if (!IdentityProvider.type ||
    typeof IdentityProvider.type !== 'string') {
    throw new Error('Given IdentityProvider doesn\'t have a field \'type\'')
  }

  supportedTypes[IdentityProvider.type] = IdentityProvider
}

/**
 * Removes an identity provider.
 * @param {string} type The identity provider type.
 * @static
 */
const removeIdentityProvider = (type) => {
  delete supportedTypes[type]
}

export {
  Identities as default,
  isProviderSupported,
  addIdentityProvider,
  removeIdentityProvider
}
