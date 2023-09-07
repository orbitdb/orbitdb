const type = 'custom'

const verifyIdentity = async (data) => { return true }

const CustomIdentityProvider = () => async () => {
  const getId = () => { return 'custom' }

  const signIdentity = (data) => { return `signature '${data}'` }

  return {
    getId,
    signIdentity,
    type
  }
}

CustomIdentityProvider.verifyIdentity = verifyIdentity
CustomIdentityProvider.type = type

export default CustomIdentityProvider
