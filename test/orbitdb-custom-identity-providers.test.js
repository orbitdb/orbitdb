import { deepStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { createOrbitDB, Identities, useIdentityProvider } from '../src/index.js'
// import pathJoin from '../src/utils/path-join.js'
import CustomIdentityProvider from './fixtures/providers/custom.js'
import createHelia from './utils/create-helia.js'

describe('Add a custom identity provider', function () {
  this.timeout(5000)

  let ipfs

  before(async () => {
    ipfs = await createHelia()
  })

  it('creates an identity using an id and default pubkey provider', async () => {
    useIdentityProvider(CustomIdentityProvider)
    const identities = await Identities()
    const identity = await identities.createIdentity({ id: 'abc' })
    const orbitdb = await createOrbitDB({ ipfs, identities, id: 'abc' })

    deepStrictEqual(orbitdb.identity, identity)

    await orbitdb.stop()
  })

  it('creates an identity using a custom provider', async () => {
    useIdentityProvider(CustomIdentityProvider)
    const identities = await Identities()
    const identity = { provider: CustomIdentityProvider() }
    const expectedIdentity = await identities.createIdentity(identity)
    const orbitdb = await createOrbitDB({ ipfs, identities, identity })

    deepStrictEqual(orbitdb.identity, expectedIdentity)

    await orbitdb.stop()
  })

  it('uses an existing identity created with a custom provider', async () => {
    useIdentityProvider(CustomIdentityProvider)
    const identities = await Identities()
    const identity = await identities.createIdentity({ provider: CustomIdentityProvider() })
    const orbitdb = await createOrbitDB({ ipfs, identities, identity })

    deepStrictEqual(orbitdb.identity, identity)

    await orbitdb.stop()
  })

  after(async () => {
    if (ipfs) {
      await ipfs.stop()
    }

    await rimraf('./orbitdb')
    await rimraf('./ipfs1')
  })
})
