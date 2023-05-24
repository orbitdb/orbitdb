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

// export { default as DIDIdentityProvider } from './did.js'
// export { default as EthIdentityProvider } from './ethereum.js'
export * as PublicKeyIdentityProvider from './publickey.js'
