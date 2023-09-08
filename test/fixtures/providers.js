const customIdentityProvider = () => {
  const verifyIdentity = async (data) => { return true }

  const CustomIdentityProvider = () => () => {
    const getId = () => { return 'custom' }

    const signIdentity = (data) => { return `signature '${data}'` }

    return {
      getId,
      signIdentity,
      type: 'custom'
    }
  }

  return {
    default: CustomIdentityProvider,
    type: 'custom',
    verifyIdentity
  }
}

const fakeIdentityProvider = () => {
  const verifyIdentity = async (data) => { return false }

  const FakeIdentityProvider = () => () => {
    const getId = () => { return 'pubKey' }

    const signIdentity = (data) => { return `false signature '${data}'` }

    return {
      getId,
      signIdentity,
      type: 'fake'
    }
  }

  return {
    default: FakeIdentityProvider,
    verifyIdentity,
    type: 'fake'
  }
}

const CustomIdentityProvider = customIdentityProvider()
const FakeIdentityProvider = fakeIdentityProvider()

export { CustomIdentityProvider, FakeIdentityProvider }