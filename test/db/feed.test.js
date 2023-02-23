import { deepStrictEqual, strictEqual } from 'assert'
import mapSeries from 'p-map-series'
import rimraf from 'rimraf'
import { Log, Entry } from '../../src/oplog/index.js'
import { Feed, Database } from '../../src/db/index.js'
import { IPFSBlockStorage, LevelStorage } from '../../src/storage/index.js'
import { config, testAPIs, startIpfs, stopIpfs } from 'orbit-db-test-utils'
import { createTestIdentities, cleanUpTestIdentities } from '../fixtures/orbit-db-identity-keys.js'

const { sync: rmrf } = rimraf

const OpLog = { Log, Entry, IPFSBlockStorage, LevelStorage }

Object.keys(testAPIs).forEach((IPFS) => {
  describe('Feed Database (' + IPFS + ')', function () {
    this.timeout(config.timeout * 2)

    let ipfsd
    let ipfs
    let keystore, signingKeyStore
    let accessController
    let identities1
    let testIdentity1
    let db

    const databaseId = 'feed-AAA'

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
      db = await Feed({ OpLog, Database, ipfs, identity: testIdentity1, databaseId, accessController })
    })

    afterEach(async () => {
      if (db) {
        await db.drop()
        await db.close()
      }
    })

    it('creates a feed', async () => {
      strictEqual(db.databaseId, databaseId)
      strictEqual(db.type, 'feed')
    })
    
    it('returns 0 items when it\'s a fresh database', async () => {
      const all = []
      for await (const item of db.iterator()) {
        all.unshift(item)
      }
      
      strictEqual(all.length, 0)
    })
    
    it('adds a feed item', async () => {
      const expected = 'zdpuApFgnZNp6qQqeuHRLJhEKsmMnXEEJfSZofLc3ZZXEihWE'

      const actual = await db.add('init')
      strictEqual(actual, expected)
    })

    it('puts a feed item', async () => {
      const expected = 'zdpuApFgnZNp6qQqeuHRLJhEKsmMnXEEJfSZofLc3ZZXEihWE'

      const actual = await db.put(null, 'init')
      strictEqual(actual, expected)
    })

    it('gets a feed item', async () => {
      const expected = 'init'

      const hash = await db.add(expected)

      const actual = await db.get(hash)
      strictEqual(actual, expected)
    })

    it('deletes a feed item', async () => {
      const expected = null

      const add = await db.add('delete me')
      const del = await db.del(add)

      const actual = await db.get(del)
      strictEqual(actual, expected)
    })
    
    it('deletes a non-existent feed item', async () => {
      const expected = null
      
      const del = await db.del('zdpuApFgnZNp6qQqeuHRLJhEKsmMnXEEJfSZofLc3ZZXEihWE')

      const actual = await db.get(del)
      strictEqual(actual, expected)
    })

    it('returns all feed items', async () => {
      const feed = [
        'init',
        true,
        'hello',
        'friend',
        '12345',
        'empty',
        'friend33'
      ]

      for (const f of feed) {
        await db.add(f)
      }

      const all = await db.all()

      deepStrictEqual(all.map(e => e.value), feed)
    })

    describe('Iterator Options', () => {
      let hashes = []
      const last = arr => arr[arr.length - 1]
      const first = arr => arr[0]

      beforeEach(async () => {
        hashes = []
        hashes = await mapSeries([0, 1, 2, 3, 4], (i) => db.add('hello' + i))
      })

      describe('amount', () => {
        it('returns one item', async () => {
          const expected = ['hello4']

          const all = []
          for await (const record of db.iterator({ amount: 1 })) {
            all.unshift(record)
          }

          strictEqual(all.length, 1)
          deepStrictEqual(all.map(e => e.value), expected)
        })

        it('returns two items', async () => {
          const expected = ['hello3', 'hello4']

          const all = []
          for await (const record of db.iterator({ amount: 2 })) {
            all.unshift(record)
          }

          strictEqual(all.length, 2)
          deepStrictEqual(all.map(e => e.value), expected)
        })

        it('returns three items', async () => {
          const expected = ['hello2', 'hello3', 'hello4']

          const all = []
          for await (const record of db.iterator({ amount: 3 })) {
            all.unshift(record)
          }

          strictEqual(all.length, 3)
          deepStrictEqual(all.map(e => e.value), expected)
        })

        it('sets \'amount\' greater than items available', async () => {
          const expected = ['hello0', 'hello1', 'hello2', 'hello3', 'hello4']

          const all = []
          for await (const record of db.iterator({ amount: 100 })) {
            all.unshift(record)
          }

          strictEqual(all.length, 5)
          deepStrictEqual(all.map(e => e.value), expected)
        })

        it('sets \'amount\' to 0', async () => {
          const expected = []

          const all = []
          for await (const record of db.iterator({ amount: 0 })) {
            all.unshift(record)
          }

          strictEqual(all.length, 0)
          deepStrictEqual(all.map(e => e.value), expected)
        })
      })

      describe('lt', () => {
        it('returns all items less than head', async () => {
          const expected = ['hello0', 'hello1', 'hello2', 'hello3']

          const all = []
          for await (const record of db.iterator({ lt: last(hashes) })) {
            all.unshift(record)
          }

          strictEqual(all.length, 4)
          deepStrictEqual(all.map(e => e.value), expected)
        })

        it('returns one item less than head', async () => {
          const expected = ['hello3']

          const all = []
          for await (const record of db.iterator({ lt: last(hashes), amount: 1 })) {
            all.unshift(record)
          }

          strictEqual(all.length, 1)
          deepStrictEqual(all.map(e => e.value), expected)
        })

        it('returns two items less than head', async () => {
          const expected = ['hello2', 'hello3']

          const all = []
          for await (const record of db.iterator({ lt: last(hashes), amount: 2 })) {
            all.unshift(record)
          }

          strictEqual(all.length, 2)
          deepStrictEqual(all.map(e => e.value), expected)
        })
      })

      describe('lte', () => {
        it('returns all items less or equal to head', async () => {
          const expected = ['hello0', 'hello1', 'hello2', 'hello3', 'hello4']

          const all = []
          for await (const record of db.iterator({ lte: last(hashes) })) {
            all.unshift(record)
          }

          strictEqual(all.length, 5)
          deepStrictEqual(all.map(e => e.value), expected)
        })

        it('returns one item less than or equal to head', async () => {
          const expected = ['hello4']

          const all = []
          for await (const record of db.iterator({ lte: last(hashes), amount: 1 })) {
            all.unshift(record)
          }

          strictEqual(all.length, 1)
          deepStrictEqual(all.map(e => e.value), expected)
        })

        it('returns two items less than or equal to head', async () => {
          const expected = ['hello3', 'hello4']

          const all = []
          for await (const record of db.iterator({ lte: last(hashes), amount: 2 })) {
            all.unshift(record)
          }

          strictEqual(all.length, 2)
          deepStrictEqual(all.map(e => e.value), expected)
        })
      })

      describe('gt', () => {
        it('returns all items greater than root', async () => {
          const expected = ['hello1', 'hello2', 'hello3', 'hello4']

          const all = []
          for await (const record of db.iterator({ gt: first(hashes) })) {
            all.unshift(record)
          }

          strictEqual(all.length, 4)
          deepStrictEqual(all.map(e => e.value), expected)
        })

        it('returns one item greater than root', async () => {
          const expected = ['hello1']

          const all = []
          for await (const record of db.iterator({ gt: first(hashes), amount: 1 })) {
            all.unshift(record)
          }

          strictEqual(all.length, 1)
          deepStrictEqual(all.map(e => e.value), expected)
        })

        it('returns two items greater than root', async () => {
          const expected = ['hello1', 'hello2']

          const all = []
          for await (const record of db.iterator({ gt: first(hashes), amount: 2 })) {
            all.unshift(record)
          }

          strictEqual(all.length, 2)
          deepStrictEqual(all.map(e => e.value), expected)
        })
      })

      describe('gte', () => {
        it('returns all items greater than or equal to root', async () => {
          const expected = ['hello0', 'hello1', 'hello2', 'hello3', 'hello4']

          const all = []
          for await (const record of db.iterator({ gte: first(hashes) })) {
            all.unshift(record)
          }

          strictEqual(all.length, 5)
          deepStrictEqual(all.map(e => e.value), expected)
        })

        it('returns one item greater than or equal to root', async () => {
          const expected = ['hello0']

          const all = []
          for await (const record of db.iterator({ gte: first(hashes), amount: 1 })) {
            all.unshift(record)
          }

          strictEqual(all.length, 1)
          deepStrictEqual(all.map(e => e.value), expected)
        })

        it('returns two items greater than or equal to root', async () => {
          const expected = ['hello0', 'hello1']

          const all = []
          for await (const record of db.iterator({ gte: first(hashes), amount: 2 })) {
            all.unshift(record)
          }

          strictEqual(all.length, 2)
          deepStrictEqual(all.map(e => e.value), expected)
        })
      })

      describe('range', async () => {
        it('returns all items greater than root and less than head', async () => {
          const expected = ['hello1', 'hello2', 'hello3']

          const all = []
          for await (const record of db.iterator({ gt: first(hashes), lt: last(hashes) })) {
            all.unshift(record)
          }

          strictEqual(all.length, 3)
          deepStrictEqual(all.map(e => e.value), expected)
        })
      })
    })
  })
})