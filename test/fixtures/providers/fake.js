const type = 'fake'

const verifyIdentity = async (data) => { return false }

const FakeIdentityProvider = () => async () => {
  const getId = () => { return 'pubKey' }

  const signIdentity = (data) => { return `false signature '${data}'` }
  
  return {
    getId,
    signIdentity,
    type
  }
}

FakeIdentityProvider.verifyIdentity = verifyIdentity
FakeIdentityProvider.type = type

export default FakeIdentityProvider
