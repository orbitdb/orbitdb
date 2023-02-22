import { deepStrictEqual, strictEqual } from 'assert'
import mapSeries from 'p-map-series'
import rimraf from 'rimraf'
import { Log, Entry } from '../../src/oplog/index.js'
import { EventStore, Database } from '../../src/db/index.js'
import { IPFSBlockStorage, LevelStorage } from '../../src/storage/index.js'
import { config, testAPIs, startIpfs, stopIpfs } from 'orbit-db-test-utils'
import { createTestIdentities, cleanUpTestIdentities } from '../fixtures/orbit-db-identity-keys.js'

const { sync: rmrf } = rimraf

const OpLog = { Log, Entry, IPFSBlockStorage, LevelStorage }

Object.keys(testAPIs).forEach((IPFS) => {
  describe('EventStore Database (' + IPFS + ')', function () {
    this.timeout(config.timeout * 2)

    let ipfsd
    let ipfs
    let keystore, signingKeyStore
    let accessController
    let identities1
    let testIdentity1
    let db

    const databaseId = 'documentstore-AAA'

    before(async () => {
      // Start two IPFS instances
      ipfsd = await startIpfs(IPFS, config.daemon1)
      ipfs = ipfsd.api

      const [identities, testIdentities] = await createTestIdentities(ipfs)
      identities1 = identities[0]
      testIdentity1 = testIdentities[0]

      rmrf(testIdentity1.id)
    })

    after(async () => {
      await cleanUpTestIdentities([identities1])

      if (ipfsd) {
        await stopIpfs(ipfsd)
      }
      if (keystore) {
        await keystore.close()
      }
      if (signingKeyStore) {
        await signingKeyStore.close()
      }
      if (testIdentity1) {
        rmrf(testIdentity1.id)
      }
    })

    beforeEach(async () => {
      db = await EventStore({ OpLog, Database, ipfs, identity: testIdentity1, databaseId, accessController })
    })

    afterEach(async () => {
      if (db) {
        await db.drop()
        await db.close()
      }
    })

    it('creates a document store', async () => {
      strictEqual(db.databaseId, databaseId)
      strictEqual(db.type, 'eventstore')
    })

    it('puts an event', async () => {
      const expected = 'init'

      const hash = await db.put(null, expected)

      const actual = await db.get(hash)
      strictEqual(actual, expected)
    })

    it('gets an event', async () => {
      const expected = 'init'

      const hash = await db.add(expected)

      const actual = await db.get(hash)
      strictEqual(actual, expected)
    })

    it('returns all events', async () => {
      const events = [
        'init',
        true,
        'hello',
        'friend',
        '12345',
        'empty',
        'friend33'
      ]

      for (const ev of events) {
        await db.add(ev)
      }

      const all = await db.all()

      deepStrictEqual(all.map(e => e.value), events)
    })

    it('returns all events with full operation', async () => {
      const events = [
        'init',
        true,
        'hello',
        'friend',
        '12345',
        'empty',
        'friend33'
      ]
      
      const adds = []
      for (const ev of events) {
        adds.push(await db.add(ev))
      }

      const hashes = []
      for await (const entry of db.iterator()) {
        hashes.unshift(entry.hash)
      }

      deepStrictEqual(adds, hashes)
    })

    describe('Iterator', () => {
      let hashes = []
      const last = arr => arr[arr.length - 1]
      const first = arr => arr[0]

      beforeEach(async () => {
        hashes = []
        hashes = await mapSeries([0, 1, 2, 3, 4], (i) => db.add('hello' + i))
      })

      it('returns items less than head', async () => {
        const all = []
        for await (const ev of db.iterator({ lt: last(hashes) })) {
          all.unshift(ev)
        }

        strictEqual(all.length, 4)
        deepStrictEqual(all.map(e => e.value), ['hello0', 'hello1', 'hello2', 'hello3'])
      })
      
      it('returns items less or equal to head', async () => {
        const all = []
        for await (const ev of db.iterator({ lte: last(hashes) })) {
          all.unshift(ev)
        }

        strictEqual(all.length, 5)
        deepStrictEqual(all.map(e => e.value), ['hello0', 'hello1', 'hello2', 'hello3', 'hello4'])
      })
      
      it('returns items greater than root', async () => {
        const all = []
        for await (const ev of db.iterator({ gt: first(hashes) })) {
          all.unshift(ev)
        }

        strictEqual(all.length, 4)
        deepStrictEqual(all.map(e => e.value), ['hello1', 'hello2', 'hello3', 'hello4'])
      }) 
      
      it('returns items greater than or equal to root', async () => {
        const all = []
        for await (const ev of db.iterator({ gte: first(hashes) })) {
          all.unshift(ev)
        }

        strictEqual(all.length, 5)
        deepStrictEqual(all.map(e => e.value), ['hello0', 'hello1', 'hello2', 'hello3', 'hello4'])
      })

      it('returns head only', async () => {
        const all = []
        for await (const ev of db.iterator({ amount: 1 })) {
          all.unshift(ev)
        }
      
        strictEqual(all.length, 1)
        deepStrictEqual(all.map(e => e.value), ['hello4'])
      })
      
      it('returns head + 1', async () => {
        const all = []
        for await (const ev of db.iterator({ amount: 2 })) {
          all.unshift(ev)
        }

        strictEqual(all.length, 2)
        deepStrictEqual(all.map(e => e.value), ['hello3', 'hello4'])
      })

      it('returns head + 2', async () => {
        const all = []
        for await (const ev of db.iterator({ amount: 3 })) {
          all.unshift(ev)
        }

        strictEqual(all.length, 3)
        deepStrictEqual(all.map(e => e.value), ['hello2', 'hello3', 'hello4'])
      })

      it('returns next item greater than root', async () => {
        const all = []
        for await (const ev of db.iterator({ gt: first(hashes), amount: 1 })) {
          all.unshift(ev)
        }

        strictEqual(all.length, 1)
        deepStrictEqual(all.map(e => e.value), ['hello1'])
      })
      
      it('returns next two items greater than root', async () => {
        const all = []
        for await (const ev of db.iterator({ gt: first(hashes), amount: 2 })) {
          all.unshift(ev)
        }

        strictEqual(all.length, 2)
        deepStrictEqual(all.map(e => e.value), ['hello1', 'hello2'])
      })

      it('returns first item less than head', async () => {
        const all = []
        for await (const ev of db.iterator({ lt: last(hashes), amount: 1 })) {
          all.unshift(ev)
        }

        strictEqual(all.length, 1)
        deepStrictEqual(all.map(e => e.value), ['hello3'])
      })      
    })
  })
})
