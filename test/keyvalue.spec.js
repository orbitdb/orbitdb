import { deepStrictEqual, strictEqual } from 'assert'
import rimraf from 'rimraf'
import { Log, Entry } from '../src/oplog/index.js'
import { Identities } from '../src/identities/index.js'
import KeyStore from '../src/key-store.js'
import { KeyValue, KeyValuePersisted, Database } from '../src/db/index.js'
import { IPFSBlockStorage, LevelStorage } from '../src/storage/index.js'

// Test utils
import { config, testAPIs, getIpfsPeerId, waitForPeers, startIpfs, stopIpfs } from 'orbit-db-test-utils'
import connectPeers from './utils/connect-nodes.js'
import waitFor from './utils/wait-for.js'
import { identityKeys, signingKeys, createTestIdentities, cleanUpTestIdentities } from './fixtures/orbit-db-identity-keys.js'

const { sync: rmrf } = rimraf
const { createIdentity } = Identities

const OpLog = { Log, Entry, IPFSBlockStorage, LevelStorage }

Object.keys(testAPIs).forEach((IPFS) => {
  describe('KeyValue Database (' + IPFS + ')', function () {
    this.timeout(config.timeout)

    let ipfsd1, ipfsd2
    let ipfs1, ipfs2
    let keystore, signingKeyStore
    let peerId1, peerId2
    let identities1, identities2
    let testIdentity1, testIdentity2
    let kv1, kv2

    const databaseId = 'kv-AAA'

    const accessController = {
      canAppend: async (entry) => {
        const identity = await identities1.getIdentity(entry.identity)
        return identity.id === testIdentity1.id
      }
    }

    before(async () => {
      // Start two IPFS instances
      ipfsd1 = await startIpfs(IPFS, config.daemon1)
      ipfsd2 = await startIpfs(IPFS, config.daemon2)
      ipfs1 = ipfsd1.api
      ipfs2 = ipfsd2.api

      await connectPeers(ipfs1, ipfs2)

      // Get the peer IDs
      peerId1 = await getIpfsPeerId(ipfs1)
      peerId2 = await getIpfsPeerId(ipfs2)

      const [identities, testIdentities] = await createTestIdentities(ipfs1, ipfs2)
      identities1 = identities[0]
      identities2 = identities[1]
      testIdentity1 = testIdentities[0]
      testIdentity2 = testIdentities[1]

      rmrf(testIdentity1.id)
      rmrf(testIdentity2.id)
    })

    after(async () => {
      await cleanUpTestIdentities([identities1, identities2])

      if (ipfsd1) {
        await stopIpfs(ipfsd1)
      }
      if (ipfsd2) {
        await stopIpfs(ipfsd2)
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
      if (testIdentity2) {
        rmrf(testIdentity2.id)
      }
    })

    afterEach(async () => {
      if (kv1) {
        await kv1.drop()
        await kv1.close()
      }
      if (kv2) {
        await kv2.drop()
        await kv2.close()
      }
    })

    describe('using database', () => {
      it('returns all entries in the database', async () => {
        // let error
        let updateCount = 0
        // const syncCount = 0

        const onUpdate = (entry) => {
          ++updateCount
        }
        // const onSync = (entry) => {
        //   ++syncCount
        // }
        const onError = () => {
          // error = err
        }

        // kv1 = await KeyValue({ KeyValue: KeyValue, OpLog, Database, ipfs: ipfs1, identity: testIdentity1, databaseId, accessController })
        // kv2 = await KeyValue({ KeyValue: KeyValue, OpLog, Database, ipfs: ipfs2, identity: testIdentity2, databaseId, accessController })
        kv1 = await KeyValuePersisted({ KeyValue: KeyValue, OpLog, Database, ipfs: ipfs1, identity: testIdentity1, databaseId, accessController })
        kv2 = await KeyValuePersisted({ KeyValue: KeyValue, OpLog, Database, ipfs: ipfs2, identity: testIdentity2, databaseId, accessController })

        // kv1.events.on('update', onUpdate)
        kv2.events.on('update', onUpdate)
        // kv1.events.on('sync', onSync)
        // kv2.events.on('sync', onSync)
        kv1.events.on('error', onError)
        kv2.events.on('error', onError)

        strictEqual(kv1.type, 'kv')
        strictEqual(kv2.type, 'kv')

        await waitForPeers(ipfs1, [peerId2], databaseId)
        await waitForPeers(ipfs2, [peerId1], databaseId)

        // send a garbage message to pubsub to test onError firing
        // await ipfs1.pubsub.publish(databaseId, Uint8Array.from([1, 2, 3, 4, 5]))

        await kv1.set('init', true)
        await kv1.set('hello', 'friend')
        await kv1.del('hello')
        await kv1.set('hello', 'friend2')
        await kv1.del('hello')
        await kv1.set('empty', '')
        await kv1.del('empty')
        await kv1.set('hello', 'friend3')
        // const hash = await kv1.set('hello', 'friend3')
        // const lastEntry = await kv1.database.log.get(hash)

        // sync() test
        // console.time('sync')
        // await kv2.sync(lastEntry.bytes)
        // console.timeEnd('sync')

        await waitFor(() => updateCount, () => 8)

        // update event test
        strictEqual(updateCount, 8)
        // sync event test
        // strictEqual(syncCount, 8)

        // write access test
        // let errorMessage
        // try {
        //   await kv2.set('hello', 'friend4')
        // } catch (e) {
        //   errorMessage = e.message
        // } finally {
        //   const valueNotUpdated = await kv2.get('hello')
        //   strictEqual(valueNotUpdated, 'friend3')
        //   notStrictEqual(errorMessage, undefined)
        //   strictEqual(errorMessage.startsWith('Could not append entry:\nKey'), true)
        // }

        // get() test
        console.time('get')
        const value0 = await kv2.get('init')
        console.timeEnd('get')
        console.log(value0)
        deepStrictEqual(value0, true)

        const value2 = await kv2.get('hello')
        console.log(value2)
        deepStrictEqual(value2, 'friend3')

        const value1 = await kv1.get('hello')
        console.log(value1)
        deepStrictEqual(value1, 'friend3')

        const value9 = await kv1.get('empty')
        console.log(value9)
        deepStrictEqual(value9, undefined)

        // all() test
        const all2 = []
        console.time('all2')
        for await (const keyValue of kv2.iterator()) {
          console.log('>', keyValue)
          all2.push(keyValue)
        }
        console.timeEnd('all2')
        deepStrictEqual(all2, [
          { key: 'hello', value: 'friend3' },
          { key: 'init', value: true }
        ])

        const all1 = []
        console.time('all1')
        for await (const keyValue of kv1.iterator()) {
          console.log('>', keyValue)
          all1.push(keyValue)
        }
        console.timeEnd('all1')
        deepStrictEqual(all1, [
          { key: 'hello', value: 'friend3' },
          { key: 'init', value: true }
        ])

        // onError test
        // notStrictEqual(error, undefined)
        // strictEqual(error.message, 'CBOR decode error: too many terminals, data makes no sense')
      })
    })

    describe('load database', () => {
      it('returns all entries in the database', async () => {
        let updateCount = 0
        // let syncCount = 0

        const onUpdate = (entry) => {
          ++updateCount
        }
        // const onSync = (entry) => {
        //   ++syncCount
        // }

        // kv1 = await KeyValue({ KeyValue: KeyValue, OpLog, Database, ipfs: ipfs1, identity: testIdentity1, databaseId, accessController })
        // kv2 = await KeyValue({ KeyValue: KeyValue, OpLog, Database, ipfs: ipfs2, identity: testIdentity2, databaseId, accessController })
        kv1 = await KeyValuePersisted({ KeyValue: KeyValue, OpLog, Database, ipfs: ipfs1, identity: testIdentity1, databaseId, accessController })
        kv2 = await KeyValuePersisted({ KeyValue: KeyValue, OpLog, Database, ipfs: ipfs2, identity: testIdentity2, databaseId, accessController })

        // kv1.events.on('update', onUpdate)
        kv2.events.on('update', onUpdate)
        // kv1.events.on('sync', onSync)
        // kv2.events.on('sync', onSync)

        await waitForPeers(ipfs1, [peerId2], databaseId)
        await waitForPeers(ipfs2, [peerId1], databaseId)

        await kv1.set('init', true)
        await kv1.set('hello', 'friend')
        await kv1.del('hello')
        await kv1.set('hello', 'friend2')
        await kv1.del('hello')
        await kv1.set('empty', '')
        await kv1.del('empty')
        await kv1.set('hello', 'friend3')
        // const hash = await kv1.set('hello', 'friend3')
        // const lastEntry = await kv1.log.get(hash)

        // sync() test
        // console.time('sync')
        // await kv2.sync(lastEntry.bytes)
        // console.timeEnd('sync')

        await waitFor(() => updateCount, () => 8)
        strictEqual(updateCount, 8)

        await kv1.close()
        await kv2.close()

        // kv1 = await KeyValue({ KeyValue: KeyValue, OpLog, Database, ipfs: ipfs1, identity: testIdentity1, databaseId, accessController })
        // kv2 = await KeyValue({ KeyValue: KeyValue, OpLog, Database, ipfs: ipfs2, identity: testIdentity2, databaseId, accessController })
        kv1 = await KeyValuePersisted({ KeyValue: KeyValue, OpLog, Database, ipfs: ipfs1, identity: testIdentity1, databaseId, accessController })
        kv2 = await KeyValuePersisted({ KeyValue: KeyValue, OpLog, Database, ipfs: ipfs2, identity: testIdentity2, databaseId, accessController })

        console.time('get')
        const value0 = await kv2.get('init')
        console.timeEnd('get')
        console.log(value0)
        deepStrictEqual(value0, true)

        const value2 = await kv2.get('hello')
        console.log(value2)
        deepStrictEqual(value2, 'friend3')

        const value1 = await kv1.get('hello')
        console.log(value1)
        deepStrictEqual(value1, 'friend3')

        const value9 = await kv1.get('empty')
        console.log(value9)
        deepStrictEqual(value9, undefined)

        const all2 = []
        console.time('all2')
        for await (const keyValue of kv2.iterator()) {
          console.log('>', keyValue)
          all2.push(keyValue)
        }
        console.timeEnd('all2')
        deepStrictEqual(all2, [
          { key: 'hello', value: 'friend3' },
          { key: 'init', value: true }
        ])

        const all1 = []
        console.time('all1')
        for await (const keyValue of kv1.iterator()) {
          console.log('>', keyValue)
          all1.push(keyValue)
        }
        console.timeEnd('all1')
        deepStrictEqual(all1, [
          { key: 'hello', value: 'friend3' },
          { key: 'init', value: true }
        ])
      })
    })
  })
})
