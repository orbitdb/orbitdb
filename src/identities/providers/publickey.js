/**
 * @namespace module:IdentityProviders.IdentityProviders-PublicKey
 * @description PublicKey Identity Provider
 */
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import IdentityProvider from './interface.js'
import { signMessage, verifyMessage } from '../../key-store.js'

const type = 'publickey'

class PublicKeyIdentityProvider extends IdentityProvider {
  constructor ({ keystore }) {
    super()

    if (!keystore) {
      throw new Error('PublicKeyIdentityProvider requires a keystore parameter')
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
    return uint8ArrayToString(key.public.marshal(), 'base16')
  }

  async signIdentity (data, { id } = {}) {
    if (!id) {
      throw new Error('id is required')
    }

    const key = await this._keystore.getKey(id)
    if (!key) {
      throw new Error(`Signing key for '${id}' not found`)
    }

    return signMessage(key, data)
  }

  static async verifyIdentity (identity) {
    const { id, publicKey, signatures } = identity
    // Verify that identity was signed by the ID
    return verifyMessage(signatures.publicKey, id, publicKey + signatures.id)
  }
}

export default PublicKeyIdentityProvider
