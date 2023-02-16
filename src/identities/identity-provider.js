import Identity from './identity.js'
import IdentityProvider from './providers/interface.js'
import OrbitDBIdentityProvider from './providers/orbitdb.js'
// import DIDIdentityProvider from './identity-providers/did.js'
// import EthIdentityProvider from './identity-providers/ethereum.js'
import KeyStore from '../key-store.js'
import IdentityStorage from '../storage/identity.js'
import LRU from 'lru'
import path from 'path'

const defaultType = 'orbitdb'
const identityKeysPath = path.join('./orbitdb', 'identity', 'identitykeys')

const supportedTypes = {
  orbitdb: OrbitDBIdentityProvider
  // [DIDIdentityProvider.type]: DIDIdentityProvider,
  // [EthIdentityProvider.type]: EthIdentityProvider
}

const getHandlerFor = (type) => {
  if (!Identities.isSupported(type)) {
    throw new Error(`IdentityProvider type '${type}' is not supported`)
  }
  return supportedTypes[type]
}

class Identities {
  constructor (options) {
    this._keystore = options.keystore
    this._signingKeyStore = options.signingKeyStore || this._keystore
    this._knownIdentities = options.cache || new LRU(options.cacheSize || 100)
    this._storage = options.identityStore
  }

  static get IdentityProvider () { return IdentityProvider }

  get keystore () { return this._keystore }

  get signingKeyStore () { return this._signingKeyStore }

  async sign (identity, data) {
    const signingKey = await this.keystore.getKey(identity.id)
    if (!signingKey) {
      throw new Error('Private signing key not found from KeyStore')
    }
    const sig = await this.keystore.sign(signingKey, data)
    return sig
  }

  async verify (signature, publicKey, data, verifier = 'v1') {
    return this.keystore.verify(signature, publicKey, data, verifier)
  }

  async createIdentity (options = {}) {
    const keystore = options.keystore || this.keystore
    const type = options.type || defaultType
    const identityProvider = type === defaultType ? new OrbitDBIdentityProvider(options.signingKeyStore || keystore) : new (getHandlerFor(type))(options)
    const id = await identityProvider.getId(options)

    const { publicKey, idSignature } = await this.signId(id)
    const pubKeyIdSignature = await identityProvider.signIdentity(publicKey + idSignature, options)
    // return new Identity(id, publicKey, idSignature, pubKeyIdSignature, type, this)
    const identity = new Identity(id, publicKey, idSignature, pubKeyIdSignature, type, this)
    await identity.store()
    // const hash = options.identityStore.put(identity.toJSON())
    return identity
  }

  async get (hash) {
    return this._storage.get(hash)
  }

  async signId (id) {
    const keystore = this.keystore
    const key = await keystore.getKey(id) || await keystore.createKey(id)
    const publicKey = keystore.getPublic(key)
    const idSignature = await keystore.sign(key, id)
    return { publicKey, idSignature }
  }

  async verifyIdentity (identity) {
    if (!Identity.isIdentity(identity)) {
      return false
    }

    const knownID = this._knownIdentities.get(identity.signatures.id)
    if (knownID) {
      return identity.id === knownID.id &&
             identity.publicKey === knownID.publicKey &&
             identity.signatures.id === knownID.signatures.id &&
             identity.signatures.publicKey === knownID.signatures.publicKey
    }

    const verifyIdSig = await this.keystore.verify(
      identity.signatures.id,
      identity.publicKey,
      identity.id
    )
    if (!verifyIdSig) return false

    const IdentityProvider = getHandlerFor(identity.type)
    const verified = await IdentityProvider.verifyIdentity(identity)
    if (verified) {
      this._knownIdentities.set(identity.signatures.id, Identity.toJSON(identity))
    }

    return verified
  }

  static async verifyIdentity (identity) {
    if (!Identity.isIdentity(identity)) {
      return false
    }

    const verifyIdSig = await KeyStore.verify(
      identity.signatures.id,
      identity.publicKey,
      identity.id
    )

    if (!verifyIdSig) return false

    const IdentityProvider = getHandlerFor(identity.type)
    return IdentityProvider.verifyIdentity(identity)
  }

  static async createIdentity (options = {}) {
    if (!options.keystore) {
      options.keystore = new KeyStore(options.identityKeysPath || identityKeysPath)
    }
    if (!options.signingKeyStore) {
      if (options.signingKeysPath) {
        options.signingKeyStore = new KeyStore(options.signingKeysPath)
      } else {
        options.signingKeyStore = options.keystore
      }
    }
    await options.keystore.open()
    await options.signingKeyStore.open()

    let identityStore
    if (options.storage) {
      identityStore = await IdentityStorage({ storage: options.storage })
    } else if (options.ipfs) {
      identityStore = await IdentityStorage({ ipfs: options.ipfs })
    } else {
      identityStore = await IdentityStorage()
    }

    options = Object.assign({}, { type: defaultType, identityStore }, options)
    const identities = new Identities(options)
    return identities.createIdentity(options)
  }

  static isSupported (type) {
    return Object.keys(supportedTypes).includes(type)
  }

  static addIdentityProvider (IdentityProvider) {
    if (!IdentityProvider) {
      throw new Error('IdentityProvider class needs to be given as an option')
    }

    if (!IdentityProvider.type ||
      typeof IdentityProvider.type !== 'string') {
      throw new Error('Given IdentityProvider class needs to implement: static get type() { /* return a string */ }.')
    }

    supportedTypes[IdentityProvider.type] = IdentityProvider
  }

  static removeIdentityProvider (type) {
    delete supportedTypes[type]
  }
}

export { Identities as default, Identity }
