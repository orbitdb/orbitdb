// import { strictEqual, deepStrictEqual, notStrictEqual } from 'assert'
import rmrf from 'rimraf'
import * as IPFS from 'ipfs-core'
import { createOrbitDB, Identities, useIdentityProvider } from '../src/index.js'
import config from './config.js'
// import pathJoin from '../src/utils/path-join.js'
import CustomIdentityProvider from './fixtures/providers/custom.js'

describe.skip('Add a custom identity provider', function () {
  this.timeout(5000)

  let ipfs

  before(async () => {
    ipfs = await IPFS.create({ ...config.daemon1, repo: './ipfs1' })
  })

  it('passes an existing identity', async () => {
    useIdentityProvider(CustomIdentityProvider)
    const identities = await Identities()
    const identity = await identities.createIdentity({ id: 'test', provider: CustomIdentityProvider() })
    const orbitdb = await createOrbitDB({ ipfs, identities, identity })

    await orbitdb.stop()
  })

  after(async () => {
    if (ipfs) {
      await ipfs.stop()
    }

    await rmrf('./orbitdb')
    await rmrf('./ipfs1')
  })
})
