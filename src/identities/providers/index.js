/**
 * @module IdentityProviders
 * @description
 * Identity providers for signing and verifying an identity using various
 * cryptographic mechanism.
 */
import * as PublicKeyIdentityProvider from './publickey.js'

const identityProviders = {
  publickey: PublicKeyIdentityProvider
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
const getIdentityProvider = (type) => {
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

export { addIdentityProvider, getIdentityProvider, PublicKeyIdentityProvider }
