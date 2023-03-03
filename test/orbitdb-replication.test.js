import { deepStrictEqual } from 'assert'
import rmrf from 'rimraf'
import * as IPFS from 'ipfs'
import { OrbitDB } from '../src/index.js'
import config from './config.js'
import connectPeers from './utils/connect-nodes.js'
import waitFor from './utils/wait-for.js'

describe('Replicating databases', function () {
  this.timeout(60000)

  let ipfs1, ipfs2
  let orbitdb1, orbitdb2

  before(async () => {
    await rmrf('./ipfs1')
    await rmrf('./ipfs2')
    await rmrf('./orbitdb1')
    await rmrf('./orbitdb2')

    ipfs1 = await IPFS.create({ ...config.daemon1, repo: './ipfs1' })
    ipfs2 = await IPFS.create({ ...config.daemon2, repo: './ipfs2' })

    await connectPeers(ipfs1, ipfs2)

    orbitdb1 = await OrbitDB({ ipfs: ipfs1, id: 'user1', directory: './orbitdb1' })
    orbitdb2 = await OrbitDB({ ipfs: ipfs2, id: 'user2', directory: './orbitdb2' })
  })

  after(async () => {
    await ipfs1.stop()
    await ipfs2.stop()
    await orbitdb1.stop()
    await orbitdb2.stop()
    await rmrf('./ipfs1')
    await rmrf('./ipfs2')
    await rmrf('./orbitdb1')
    await rmrf('./orbitdb2')
  })

  describe('replicating a database of 1', () => {
    const amount = 1

    const expected = []
    for (let i = 0; i < amount; i++) {
      expected.push('hello' + i)
    }

    let db1, db2

    before(async () => {
      db1 = await orbitdb1.open('helloworld')

      console.log('generate')
      console.time('generate')
      for (let i = 0; i < expected.length; i++) {
        await db1.add(expected[i])
      }
      console.timeEnd('generate')
    })

    after(async () => {
      await db1.drop()
      await db1.close()
      await db2.drop()
      await db2.close()
    })

    it('returns all entries in the replicated database', async () => {
      console.log('replicate')
      console.log('sync')
      console.time('replicate')
      console.time('sync')

      let synced = false

      const onJoin = async (peerId, heads) => {
        // const head = heads[0]
        // if (head && head.clock.time === amount) {
        console.timeEnd('sync')
        synced = true
        // }
      }

      // const onUpdated = (entry) => {
      //   if (entry.clock.time === amount) {
      //     synced = true
      //   }
      // }

      const onError = (err) => {
        console.error(err)
      }

      db2 = await orbitdb2.open(db1.address)

      db2.events.on('join', onJoin)
      // db2.events.on('update', onUpdated)
      db2.events.on('error', onError)
      db1.events.on('error', onError)

      await waitFor(() => synced, () => true)

      console.time('query 1')
      const eventsFromDb2 = []
      for await (const event of db2.iterator()) {
        eventsFromDb2.unshift(event)
      }
      console.timeEnd('query 1')

      console.timeEnd('replicate')

      deepStrictEqual(eventsFromDb2, expected)

      console.time('query 2')
      const eventsFromDb1 = []
      for await (const event of db1.iterator()) {
        eventsFromDb1.unshift(event)
      }
      console.timeEnd('query 2')

      deepStrictEqual(eventsFromDb1, expected)

      console.time('query 3')
      const eventsFromDb3 = []
      for await (const event of db2.iterator()) {
        eventsFromDb3.unshift(event)
      }
      console.timeEnd('query 3')

      deepStrictEqual(eventsFromDb3, expected)

      console.log('events:', amount)
    })
  })

  describe('replicating a database of 129', () => {
    const amount = 128 + 1

    const expected = []
    for (let i = 0; i < amount; i++) {
      expected.push('hello' + i)
    }

    let db1, db2

    before(async () => {
      db1 = await orbitdb1.open('helloworld')

      console.log('generate')
      console.time('generate')
      for (let i = 0; i < expected.length; i++) {
        await db1.add(expected[i])
      }
      console.timeEnd('generate')
    })

    after(async () => {
      await db1.drop()
      await db1.close()
      await db2.drop()
      await db2.close()
    })

    it('returns all entries in the replicated database', async () => {
      console.log('replicate')
      console.log('sync')
      console.time('replicate')
      console.time('sync')

      let synced = false

      const onJoin = async (peerId, heads) => {
        // const head = heads[0]
        // if (head && head.clock.time === amount) {
        console.timeEnd('sync')
        synced = true
        // }
      }

      // const onUpdated = (entry) => {
      //   if (entry.clock.time === amount) {
      //     synced = true
      //   }
      // }

      const onError = (err) => {
        console.error(err)
      }

      db2 = await orbitdb2.open(db1.address)

      db2.events.on('join', onJoin)
      // db2.events.on('update', onUpdated)
      db2.events.on('error', onError)
      db1.events.on('error', onError)

      await waitFor(() => synced, () => true)

      console.time('query 1')
      const eventsFromDb2 = []
      for await (const event of db2.iterator()) {
        eventsFromDb2.unshift(event)
      }
      console.timeEnd('query 1')

      console.timeEnd('replicate')

      deepStrictEqual(eventsFromDb2, expected)

      console.time('query 2')
      const eventsFromDb1 = []
      for await (const event of db1.iterator()) {
        eventsFromDb1.unshift(event)
      }
      console.timeEnd('query 2')

      deepStrictEqual(eventsFromDb1, expected)

      console.time('query 3')
      const eventsFromDb3 = []
      for await (const event of db2.iterator()) {
        eventsFromDb3.unshift(event)
      }
      console.timeEnd('query 3')

      deepStrictEqual(eventsFromDb3, expected)

      console.log('events:', amount)
    })
  })
})
