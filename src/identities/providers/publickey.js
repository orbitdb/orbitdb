/**
 * @module PublicKeyIdentityProvider
 * @memberof module:IdentityProviders
 * @description
 * The PublicKey Identity Provider signs and verifies an identity using the
 * public key of a private/public key pair.
 */
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { signMessage, verifyMessage } from '../../key-store.js'

/**
 * The type of identity provider.
 * @return string
 * @const
 */
const type = 'publickey'

/**
 * Verifies an identity using the identity's id.
 * @param {module:Identity} identity
 * @return {boolean} True if the identity is valid, false otherwise.
 * @static
 */
const verifyIdentity = identity => {
  const { id, publicKey, signatures } = identity
  return verifyMessage(signatures.publicKey, id, publicKey + signatures.id)
}

/**
 * Instantiates the publickey identity provider.
 * @return {module:IdentityProviders.IdentityProvider-PublicKey} A public key identity provider function.
 */
const PublicKeyIdentityProvider = ({ keystore }) => {
  /**
   * @namespace module:IdentityProviders.IdentityProvider-PublicKey
   * @memberof module:IdentityProviders
   * @description The instance returned by {@link module:IdentityProviders.IdentityProvider-PublicKey}.
   */

  if (!keystore) {
    throw new Error('PublicKeyIdentityProvider requires a keystore parameter')
  }

  /**
   * Gets the id.
   * @memberof module:IdentityProviders.IdentityProvider-PublicKey
   * @param {string} id The id to retrieve.
   * @return {string} The identity's id.
   * @instance
   */
  const getId = async ({ id } = {}) => {
    if (!id) {
      throw new Error('id is required')
    }

    const key = await keystore.getKey(id) || await keystore.createKey(id)
    return uint8ArrayToString(key.public.marshal(), 'base16')
  }

  /**
   * Signs an identity using the identity's id.
   * @memberof module:IdentityProviders.IdentityProvider-PublicKey
   * @param {*} data The identity data to sign.
   * @param {Object} params One or more parameters for configuring Database.
   * @param {string} [params.id] The identity's id.
   * @return {string} A signature.
   * @instance
   */
  const signIdentity = async (data, { id } = {}) => {
    if (!id) {
      throw new Error('id is required')
    }

    const key = await keystore.getKey(id)
    if (!key) {
      throw new Error(`Signing key for '${id}' not found`)
    }

    return signMessage(key, data)
  }

  return {
    getId,
    signIdentity
  }
}

export { PublicKeyIdentityProvider as default, verifyIdentity, type }
