const type = 'no-verify-identity'

const NoVerifyIdentityIdentityProvider = () => async () => {
  return {
    type
  }
}

NoVerifyIdentityIdentityProvider.type = type

export default NoVerifyIdentityIdentityProvider