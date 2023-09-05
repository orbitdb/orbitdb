import PublicKeyIdentityProvider from './publickey.js'

const identityProviders = {}

const isProviderSupported = (type) => {
  return Object.keys(identityProviders).includes(type)
}

const getIdentityProvider = (type) => {
  if (!isProviderSupported(type)) {
    throw new Error(`IdentityProvider type '${type}' is not supported`)
  }

  return identityProviders[type]
}

/**
  * Adds an identity provider.
  * @param {IdentityProvider} identityProvider The identity provider to add.
  * @throws Given IdentityProvider doesn\'t have a field \'type\'.
  * @throws Given IdentityProvider doesn\'t have a function \'verifyIdentity\'.
  * @throws IdentityProvider ${IdentityProvider.type} already added.
  * @static
  * @memberof module:Identities
  */
const addIdentityProvider = (identityProvider) => {
  if (!identityProvider.type ||
     typeof identityProvider.type !== 'string') {
    throw new Error('Given IdentityProvider doesn\'t have a field \'type\'.')
  }

  if (!identityProvider.verifyIdentity) {
    throw new Error('Given IdentityProvider doesn\'t have a function \'verifyIdentity\'.')
  }

  if (identityProviders[identityProvider.type]) {
    throw new Error(`IdentityProvider ${identityProvider.type} already added.`)
  }

  identityProviders[identityProvider.type] = identityProvider
}

addIdentityProvider(PublicKeyIdentityProvider)

export { addIdentityProvider, getIdentityProvider, PublicKeyIdentityProvider }
