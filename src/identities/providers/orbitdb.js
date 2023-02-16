import IdentityProvider from './interface.js'
import KeyStore from '../../key-store.js'
const type = 'orbitdb'

class OrbitDBIdentityProvider extends IdentityProvider {
  constructor ({ keystore }) {
    super()
    if (!keystore) {
      throw new Error('OrbitDBIdentityProvider requires a keystore')
    }
    this._keystore = keystore
  }

  // Returns the type of the identity provider
  static get type () { return type }

  async getId (options = {}) {
    const id = options.id
    if (!id) {
      throw new Error('id is required')
    }

    const keystore = this._keystore
    const key = await keystore.getKey(id) || await keystore.createKey(id)
    return Buffer.from(key.public.marshal()).toString('hex')
  }

  async signIdentity (data, options = {}) {
    const id = options.id
    if (!id) {
      throw new Error('id is required')
    }
    const keystore = this._keystore
    const key = await keystore.getKey(id)
    if (!key) {
      throw new Error(`Signing key for '${id}' not found`)
    }

    return KeyStore.sign(key, data)
  }

  static async verifyIdentity (identity) {
    // Verify that identity was signed by the ID
    return KeyStore.verify(
      identity.signatures.publicKey,
      identity.id,
      identity.publicKey + identity.signatures.id
    )
  }
}

export default OrbitDBIdentityProvider
