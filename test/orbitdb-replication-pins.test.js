import { strictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { createOrbitDB } from '../src/index.js'
import connectPeers from './utils/connect-nodes.js'
import waitFor from './utils/wait-for.js'
import createHelia from './utils/create-helia.js'
import { CID } from 'multiformats/cid'
import { base58btc } from 'multiformats/bases/base58'

describe.skip('Replicating databases', function () {
  this.timeout(10000)

  let ipfs1, ipfs2
  let orbitdb1, orbitdb2

  before(async () => {
    ipfs1 = await createHelia({ directory: './ipfs1' })
    ipfs2 = await createHelia({ directory: './ipfs2' })
    await connectPeers(ipfs1, ipfs2)

    orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'user1', directory: './orbitdb1' })
    orbitdb2 = await createOrbitDB({ ipfs: ipfs2, id: 'user2', directory: './orbitdb2' })
  })

  after(async () => {
    await orbitdb1.stop()
    await orbitdb2.stop()
    await ipfs1.stop()
    await ipfs2.stop()

    await rimraf('./orbitdb1')
    await rimraf('./orbitdb2')
    await rimraf('./ipfs1')
    await rimraf('./ipfs2')
  })

  it('pins all entries in the replicated database', async () => {
    const db1 = await orbitdb1.open('helloworld', { referencesCount: 0 })
    const hash = await db1.add('hello world')

    let replicated = false

    const onJoin = async (peerId, heads) => {
      replicated = true
    }

    const db2 = await orbitdb2.open(db1.address)

    db2.events.on('join', onJoin)

    await waitFor(() => replicated, () => true)

    const cid = CID.parse(hash, base58btc)
    strictEqual(await ipfs1.pins.isPinned(cid), true)
    strictEqual(await ipfs2.pins.isPinned(cid), false)
  })
})
