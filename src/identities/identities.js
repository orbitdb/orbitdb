/** @module Identities */
import Identity, { isIdentity, isEqual, decodeIdentity } from './identity.js'
import { PublicKeyIdentityProvider } from './providers/index.js'
// import DIDIdentityProvider from './identity-providers/did.js'
// import EthIdentityProvider from './identity-providers/ethereum.js'
import KeyStore, { signMessage, verifyMessage } from '../key-store.js'
import { LRUStorage, IPFSBlockStorage, MemoryStorage, ComposedStorage } from '../storage/index.js'
import pathJoin from '../utils/path-join.js'

const DefaultProviderType = PublicKeyIdentityProvider.type
const DefaultIdentityKeysPath = pathJoin('./orbitdb', 'identities')

const supportedTypes = {
  publickey: PublicKeyIdentityProvider
  // [DIDIdentityProvider.type]: DIDIdentityProvider,
  // [EthIdentityProvider.type]: EthIdentityProvider
}

const Identities = async ({ keystore, path, storage, ipfs } = {}) => {
  keystore = keystore || await KeyStore({ path: path || DefaultIdentityKeysPath })

  if (!storage) {
    storage = ipfs
      ? await ComposedStorage(await LRUStorage({ size: 1000 }), await IPFSBlockStorage({ ipfs, pin: true }))
      : await MemoryStorage()
  }

  const verifiedIdentitiesCache = await LRUStorage({ size: 1000 })

  const getIdentity = async (hash) => {
    const bytes = await storage.get(hash)
    if (bytes) {
      return decodeIdentity(bytes)
    }
  }

  const createIdentity = async (options = {}) => {
    options.keystore = keystore

    const type = options.type || DefaultProviderType
    const Provider = getProviderFor(type)
    const identityProvider = new Provider(options)
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

const isProviderSupported = (type) => {
  return Object.keys(supportedTypes).includes(type)
}

const getProviderFor = (type) => {
  if (!isProviderSupported(type)) {
    throw new Error(`IdentityProvider type '${type}' is not supported`)
  }

  return supportedTypes[type]
}

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

const removeIdentityProvider = (type) => {
  delete supportedTypes[type]
}

export {
  Identities as default,
  isProviderSupported,
  addIdentityProvider,
  removeIdentityProvider
}
