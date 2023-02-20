import IdentityProvider from './interface.js'
import KeyStore from '../../key-store.js'

const type = 'orbitdb'

class OrbitDBIdentityProvider extends IdentityProvider {
  constructor ({ keystore }) {
    super()

    if (!keystore) {
      throw new Error('OrbitDBIdentityProvider requires a keystore parameter')
    }

    this._keystore = keystore
  }

  // Returns the type of the identity provider
  static get type () { return type }

  async getId ({ id } = {}) {
    if (!id) {
      throw new Error('id is required')
    }
    const key = await this._keystore.getKey(id) || await this._keystore.createKey(id)
    return Buffer.from(key.public.marshal()).toString('hex')
  }

  async signIdentity (data, { id } = {}) {
    if (!id) {
      throw new Error('id is required')
    }

    const key = await this._keystore.getKey(id)
    if (!key) {
      throw new Error(`Signing key for '${id}' not found`)
    }

    return KeyStore.sign(key, data)
  }

  static async verifyIdentity (identity) {
    const { id, publicKey, signatures } = identity
    // Verify that identity was signed by the ID
    return KeyStore.verify(signatures.publicKey, id, publicKey + signatures.id)
  }
}

export default OrbitDBIdentityProvider
