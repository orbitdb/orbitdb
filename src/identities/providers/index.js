/**
 * @module IdentityProviders
 * @description
 * Identity providers.
 *
 * ## Custom Providers
 *
 * An identity provider provides a method for signing and verifying an
 * identity using a particular cryptographic mechanism.
 *
 * A custom identity provider can be used provided the module takes the
 * following form:
 * ```javascript
 * // A unique name for the identity provider
 * const type = 'custom'
 *
 * // check whether the identity was signed by the identity's id.
 * const verifyIdentity = identity => {
 *
 * }
 *
 * // The identity provider.
 * const MyCustomIdentityProvider = ({ keystore }) => {
 *   const getId = async ({ id } = {}) => {
 *
 *   }
 *
 *   const signIdentity = async (data, { id } = {}) => {
 *
 *   }
 *
 *   return {
 *     getId,
 *     signIdentity
 *   }
 * }
 *
 * export { MyCustomIdentityProvider as default, verifyIdentity, type }
 * ```
 *
 * To use it, add it to the list of known identity providers:
 * ```javascript
 * import * as MyCustomIdentityProvider from 'my-custom-identity-provider'
 * addIdentityProvider(MyCustomIdentityProvider)
 * ```
 *
 * where my-custom-identity-provider is the custom module.
 */
import * as PublicKeyIdentityProvider from './publickey.js'

const identityProviders = {
  publickey: PublicKeyIdentityProvider
  // [DIDIdentityProvider.type]: DIDIdentityProvider,
  // [EthIdentityProvider.type]: EthIdentityProvider
}

/**
  * Checks whether an identity provider is supported.
  * @param {string} type The identity provider type.
  * @return {boolean} True if the identity provider is supported, false
  * otherwise.
  * @static
  */
const isProviderSupported = (type) => {
  return Object.keys(identityProviders).includes(type)
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

  return identityProviders[type]
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

  if (identityProviders[IdentityProvider.type]) {
    throw new Error(`Type already added: ${IdentityProvider.type}`)
  }

  identityProviders[IdentityProvider.type] = IdentityProvider
}

// export { default as DIDIdentityProvider } from './did.js'
// export { default as EthIdentityProvider } from './ethereum.js'
export { identityProviders, addIdentityProvider, getProviderFor, PublicKeyIdentityProvider }
