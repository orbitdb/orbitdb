import Identity from './identity.js'
import OrbitDBIdentityProvider from './providers/orbitdb.js'
// import DIDIdentityProvider from './identity-providers/did.js'
// import EthIdentityProvider from './identity-providers/ethereum.js'
import KeyStore from '../key-store.js'
import IdentityStore from './identity-store.js'
import { LRUStorage } from '../storage/index.js'
import path from 'path'

const DefaultProviderType = 'orbitdb'
const DefaultIdentityKeysPath = path.join('./orbitdb', 'identity', 'identitykeys')

const supportedTypes = {
  orbitdb: OrbitDBIdentityProvider
  // [DIDIdentityProvider.type]: DIDIdentityProvider,
  // [EthIdentityProvider.type]: EthIdentityProvider
}

const Identities = async ({ keystore, signingKeyStore, identityKeysPath, signingKeysPath, identityStore, ipfs } = {}) => {
  keystore = keystore || new KeyStore(identityKeysPath || DefaultIdentityKeysPath)
  signingKeyStore = signingKeyStore || (signingKeysPath ? new KeyStore(signingKeysPath) : keystore)
  identityStore = identityStore || await IdentityStore({ ipfs })

  const verifiedIdentitiesCache = await LRUStorage({ size: 1000 })

  const getIdentity = async (hash) => {
    return identityStore.get(hash)
  }

  const createIdentity = async (options = {}) => {
    options.keystore = signingKeyStore || keystore

    const type = options.type || DefaultProviderType
    const Provider = getProviderFor(type)
    const identityProvider = new Provider(options)
    const id = await identityProvider.getId(options)

    const privateKey = await keystore.getKey(id) || await keystore.createKey(id)
    const publicKey = keystore.getPublic(privateKey)
    const idSignature = await KeyStore.sign(privateKey, id)
    const pubKeyIdSignature = await identityProvider.signIdentity(publicKey + idSignature, options)
    const identity = new Identity(id, publicKey, idSignature, pubKeyIdSignature, type, sign, verify)

    const hash = await identityStore.put(identity.toJSON())
    // TODO: fix this monkey patching
    identity.hash = hash

    return identity
  }

  const verifyIdentity = async (identity) => {
    if (!Identity.isIdentity(identity)) {
      return false
    }

    const { id, publicKey, signatures } = identity
    const idSignatureVerified = await KeyStore.verify(signatures.id, publicKey, id)

    if (!idSignatureVerified) {
      return false
    }

    const verifiedIdentity = await verifiedIdentitiesCache.get(signatures.id)
    if (verifiedIdentity) {
      return Identity.isEqual(identity, verifiedIdentity)
    }

    const Provider = getProviderFor(identity.type)
    const identityVerified = await Provider.verifyIdentity(identity)

    if (identityVerified) {
      await verifiedIdentitiesCache.put(signatures.id, identity.toJSON())
    }

    return identityVerified
  }

  const sign = async (identity, data) => {
    const signingKey = await keystore.getKey(identity.id)

    if (!signingKey) {
      throw new Error('Private signing key not found from KeyStore')
    }

    return KeyStore.sign(signingKey, data)
  }

  const verify = async (signature, publicKey, data) => {
    return KeyStore.verify(signature, publicKey, data)
  }

  const isSupported = (type) => {
    return Object.keys(supportedTypes).includes(type)
  }

  const getProviderFor = (type) => {
    if (!isSupported(type)) {
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

  return {
    createIdentity,
    verifyIdentity,
    getIdentity,
    sign,
    verify,
    isSupported,
    addIdentityProvider,
    removeIdentityProvider,
    keystore,
    signingKeyStore
  }
}

export { Identities as default }
