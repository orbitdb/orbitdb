import { deepStrictEqual, strictEqual } from 'assert'
import rimraf from 'rimraf'
import { Log, Entry } from '../../src/oplog/index.js'
import { DocumentStore, Database } from '../../src/db/index.js'
import { IPFSBlockStorage, LevelStorage } from '../../src/storage/index.js'
import { config, testAPIs, startIpfs, stopIpfs } from 'orbit-db-test-utils'
import { createTestIdentities, cleanUpTestIdentities } from '../fixtures/orbit-db-identity-keys.js'

const { sync: rmrf } = rimraf

const OpLog = { Log, Entry, IPFSBlockStorage, LevelStorage }

Object.keys(testAPIs).forEach((IPFS) => {
  describe('DocumentStore Database (' + IPFS + ')', function () {
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

    describe('Default index \'_id\'', () => {
      beforeEach(async () => {
        db = await DocumentStore({ OpLog, Database, ipfs, identity: testIdentity1, databaseId, accessController })
      })

      afterEach(async () => {
        if (db) {
          await db.drop()
          await db.close()
        }
      })

      it('creates a document store', async () => {
        strictEqual(db.databaseId, databaseId)
        strictEqual(db.type, 'documentstore')
        strictEqual(db.indexBy, '_id')
      })

      it('gets a document', async () => {
        const key = 'hello world 1'

        const expected = { _id: key, msg: 'writing 1 to db' }

        await db.put(expected)

        const doc = await db.get(key)
        deepStrictEqual(doc, expected)
      })

      it('throws an error when putting a document with the wrong key', async () => {
        let err
        const key = 'hello world 1'

        const expected = { wrong_key: key, msg: 'writing 1 to db' }

        try {
          await db.put(expected)
        } catch (e) {
          err = e
        }
        strictEqual(err.message, 'The provided document doesn\'t contain field \'_id\'')
      })

      it('throws an error when getting a document with the wrong key', async () => {
        let err
        const key = 'hello world 1'

        const expected = { wrong_key: key, msg: 'writing 1 to db' }

        try {
          await db.put(expected)
        } catch (e) {
          err = e
        }
        strictEqual(err.message, 'The provided document doesn\'t contain field \'_id\'')
      })

      it('deletes a document', async () => {
        const key = 'hello world 1'

        await db.put({ _id: key, msg: 'writing 1 to db' })
        await db.del(key)

        const doc = await db.get(key)
        strictEqual(doc, undefined)
      })

      it('throws an error when deleting a non-existent document', async () => {
        const key = 'i do not exist'
        let err

        try {
          await db.del(key)
        } catch (e) {
          err = e
        }

        strictEqual(err.message, `No document with key '${key}' in the database`)
      })

      it('queries for a document', async () => {
        const expected = { _id: 'hello world 1', msg: 'writing new 1 to db', views: 10 }

        await db.put({ _id: 'hello world 1', msg: 'writing 1 to db', views: 10 })
        await db.put({ _id: 'hello world 2', msg: 'writing 2 to db', views: 5 })
        await db.put({ _id: 'hello world 3', msg: 'writing 3 to db', views: 12 })
        await db.del('hello world 3')
        await db.put(expected)

        const findFn = (doc) => doc.views > 5

        deepStrictEqual(await db.query(findFn), [expected])
      })

      it('queries for a non-existent document', async () => {
        await db.put({ _id: 'hello world 1', msg: 'writing 1 to db', views: 10 })
        await db.del('hello world 1')

        const findFn = (doc) => doc.views > 5

        deepStrictEqual(await db.query(findFn), [])
      })
    })

    describe('Custom index \'doc\'', () => {
      beforeEach(async () => {
        db = await DocumentStore({ OpLog, Database, ipfs, identity: testIdentity1, databaseId, accessController, indexBy: 'doc' })
      })

      afterEach(async () => {
        if (db) {
          await db.drop()
          await db.close()
        }
      })

      it('creates a document store', async () => {
        strictEqual(db.databaseId, databaseId)
        strictEqual(db.type, 'documentstore')
        strictEqual(db.indexBy, 'doc')
      })

      it('gets a document', async () => {
        const key = 'hello world 1'

        const expected = { doc: key, msg: 'writing 1 to db' }

        await db.put(expected)

        const doc = await db.get(key)
        deepStrictEqual(doc, expected)
      })

      it('deletes a document', async () => {
        const key = 'hello world 1'

        await db.put({ doc: key, msg: 'writing 1 to db' })
        await db.del(key)

        const doc = await db.get(key)
        strictEqual(doc, undefined)
      })
      it('throws an error when putting a document with the wrong key', async () => {
        let err
        const key = 'hello world 1'

        const expected = { _id: key, msg: 'writing 1 to db' }

        try {
          await db.put(expected)
        } catch (e) {
          err = e
        }
        strictEqual(err.message, 'The provided document doesn\'t contain field \'doc\'')
      })

      it('throws an error when getting a document with the wrong key', async () => {
        let err
        const key = 'hello world 1'

        const expected = { _id: key, msg: 'writing 1 to db' }

        try {
          await db.put(expected)
        } catch (e) {
          err = e
        }
        strictEqual(err.message, 'The provided document doesn\'t contain field \'doc\'')
      })

      it('throws an error when deleting a non-existent document', async () => {
        const key = 'i do not exist'
        let err

        try {
          await db.del(key)
        } catch (e) {
          err = e
        }

        strictEqual(err.message, `No document with key '${key}' in the database`)
      })

      it('queries for a document', async () => {
        const expected = { doc: 'hello world 1', msg: 'writing new 1 to db', views: 10 }

        await db.put({ doc: 'hello world 1', msg: 'writing 1 to db', views: 10 })
        await db.put({ doc: 'hello world 2', msg: 'writing 2 to db', views: 5 })
        await db.put({ doc: 'hello world 3', msg: 'writing 3 to db', views: 12 })
        await db.del('hello world 3')
        await db.put(expected)

        const findFn = (doc) => doc.views > 5

        deepStrictEqual(await db.query(findFn), [expected])
      })

      it('queries for a non-existent document', async () => {
        await db.put({ doc: 'hello world 1', msg: 'writing 1 to db', views: 10 })
        await db.del('hello world 1')

        const findFn = (doc) => doc.views > 5

        deepStrictEqual(await db.query(findFn), [])
      })
    })
  })
})
