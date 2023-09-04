const type = 'no-verify-identity'

const NoVerifyIdentityIdentityProvider = () => () => {
  return {
    type
  }
}

NoVerifyIdentityIdentityProvider.type = type

export default NoVerifyIdentityIdentityProvider