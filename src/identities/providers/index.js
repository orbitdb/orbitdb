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
  * @param {IdentityProvider} IdentityProvider The identity provider to add.
  * @throws IdentityProvider must be given as an argument if no module is
  * provided.
  * @throws 'Given IdentityProvider doesn't have a field 'type' if the
  * IdentityProvider does not include a type property.
  * @static
  * @memberof module:Identities
  */
const addIdentityProvider = (IdentityProvider) => {
  if (!IdentityProvider) {
    throw new Error('IdentityProvider must be given as an argument')
  }

  if (!IdentityProvider.type ||
     typeof IdentityProvider.type !== 'string') {
    throw new Error('Given IdentityProvider doesn\'t have a field \'type\'')
  }
  
  if (!IdentityProvider.verifyIdentity) {
    throw new Error('Given IdentityProvider doesn\'t have a function \'verifyIdentity\'')
  }

  if (identityProviders[IdentityProvider.type]) {
    throw new Error(`Type already added: ${IdentityProvider.type}`)
  }

  identityProviders[IdentityProvider.type] = IdentityProvider
}

addIdentityProvider(PublicKeyIdentityProvider)

export { addIdentityProvider, getIdentityProvider, PublicKeyIdentityProvider }
