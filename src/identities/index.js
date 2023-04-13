/** @module IdentityProviders */
export {
  default as Identities,
  addIdentityProvider,
  removeIdentityProvider,
  isProviderSupported
} from './identities.js'

export {
  default as Identity,
  isIdentity,
  isEqual
} from './identity.js'

export { default as PublicKeyIdentityProvider } from './providers/publickey.js'
