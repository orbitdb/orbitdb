import { deepStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { createOrbitDB } from '../src/index.js'
import connectPeers from './utils/connect-nodes.js'
import waitFor from './utils/wait-for.js'
import createHelia from './utils/create-helia.js'

describe('Replicating databases', function () {
  this.timeout(10000)

  let ipfs1, ipfs2
  let orbitdb1, orbitdb2

  before(async () => {
    [ipfs1, ipfs2] = await Promise.all([createHelia(), createHelia()])
    await connectPeers(ipfs1, ipfs2)

    orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'user1', directory: './orbitdb1' })
    orbitdb2 = await createOrbitDB({ ipfs: ipfs2, id: 'user2', directory: './orbitdb2' })
  })

  after(async () => {
    await ipfs1.stop()
    await ipfs2.stop()
    await rimraf('./ipfs1')
    await rimraf('./ipfs2')
    await orbitdb1.stop()
    await orbitdb2.stop()
    await rimraf('./orbitdb1')
    await rimraf('./orbitdb2')
  })

  describe('replicating a database', () => {
    const amount = 128 + 1

    const expected = []
    for (let i = 0; i < amount; i++) {
      expected.push('hello' + i)
    }

    let db1, db2

    before(async () => {
      db1 = await orbitdb1.open('helloworld', { referencesCount: 0 })

      console.time('write')
      for (let i = 0; i < expected.length; i++) {
        await db1.add(expected[i])
      }
      console.timeEnd('write')
    })

    after(async () => {
      await db1.close()
      await db2.close()
    })

    it('returns all entries in the replicated database', async () => {
      console.time('replicate')

      let replicated = false

      const onJoin = async (peerId, heads) => {
        replicated = true
      }

      const onError = (err) => {
        console.error(err)
      }

      db2 = await orbitdb2.open(db1.address)

      db2.events.on('join', onJoin)
      db2.events.on('error', onError)
      db1.events.on('error', onError)

      await waitFor(() => replicated, () => true)

      console.time('query 1')
      const eventsFromDb2 = []
      for await (const event of db2.iterator()) {
        console.log(event)
        eventsFromDb2.unshift(event)
      }
      console.timeEnd('query 1')

      console.timeEnd('replicate')

      deepStrictEqual(eventsFromDb2.map(e => e.value), expected)

      console.time('query 2')
      const eventsFromDb1 = []
      for await (const event of db1.iterator()) {
        eventsFromDb1.unshift(event)
      }
      console.timeEnd('query 2')

      deepStrictEqual(eventsFromDb1.map(e => e.value), expected)

      console.log('events:', amount)
    })
  })
})
