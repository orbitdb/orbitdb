import { strictEqual, deepStrictEqual } from 'assert'
import rmrf from 'rimraf'
import { OrbitDB } from '../src/index.js'
import { config, startIpfs, stopIpfs } from 'orbit-db-test-utils'
import connectPeers from './utils/connect-nodes.js'
import waitFor from './utils/wait-for.js'

const IPFS = 'js-ipfs'

describe('Replicating databases', function () {
  this.timeout(60000)

  let ipfsd1, ipfsd2
  let ipfs1, ipfs2
  let orbitdb1, orbitdb2

  before(async () => {
    ipfsd1 = await startIpfs(IPFS, config.daemon1)
    ipfsd2 = await startIpfs(IPFS, config.daemon2)
    ipfs1 = ipfsd1.api
    ipfs2 = ipfsd2.api
    await connectPeers(ipfs1, ipfs2)
  })

  after(async () => {
    if (ipfsd1) {
      await stopIpfs(ipfsd1)
    }
    if (ipfsd2) {
      await stopIpfs(ipfsd2)
    }
    await rmrf('./orbitdb1')
    await rmrf('./orbitdb2')
  })

  describe('replicating a database', () => {
    let db1, db2

    const amount = 128 + 1 // Same amount as in oplog replication test

    before(async () => {
      orbitdb1 = await OrbitDB({ ipfs: ipfs1, id: 'user1', directory: './orbitdb1' })
      orbitdb2 = await OrbitDB({ ipfs: ipfs2, id: 'user2', directory: './orbitdb2' })
      db1 = await orbitdb1.open('helloworld')
      for (let i = 0; i < amount; i++) {
        await db1.add('hello' + i)
      }
    })

    after(async () => {
      if (db1) {
        await db1.close()
      }
      if (db2) {
        await db2.close()
      }
      if (orbitdb1) {
        await orbitdb1.stop()
      }
      if (orbitdb2) {
        await orbitdb2.stop()
      }
      await rmrf('./orbitdb1')
      await rmrf('./orbitdb2')
    })

    it('returns all entries in the replicated database', async () => {
      console.time('replicate2')
      let replicated = false

      const onConnected = async (peerId) => {
        const head = (await db2.log.heads())[0]
        if (head && head.clock.time === amount) {
          replicated = true
        }
      }

      const onUpdated = (entry) => {
        if (entry.clock.time === amount) {
          replicated = true
        }
      }

      const onError = (err) => {
        console.error(err)
      }

      db1.events.on('error', onError)

      db2 = await orbitdb2.open(db1.address)
      db2.events.on('join', onConnected)
      db2.events.on('update', onUpdated)
      db2.events.on('error', onError)

      await waitFor(() => replicated, () => true)

      strictEqual(db1.address, db2.address)
      strictEqual(db1.name, db2.name)
      strictEqual(db1.type, db2.type)

      const all2 = []
      console.time('all2')
      for await (const event of db2.iterator()) {
        all2.unshift(event)
      }
      console.timeEnd('all2')
      console.timeEnd('replicate2')

      const expected = []
      for (let i = 0; i < amount; i++) {
        expected.push('hello' + i)
      }

      deepStrictEqual(all2, expected)

      const all1 = []
      console.time('all1')
      for await (const event of db1.iterator()) {
        all1.unshift(event)
      }
      console.timeEnd('all1')

      deepStrictEqual(all1, expected)
    })
  })
})
