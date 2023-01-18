import { deepStrictEqual, strictEqual } from 'assert'
import rimraf from 'rimraf'
import * as Log from '../src/log.js'
import IdentityProvider from 'orbit-db-identity-provider'
import Keystore from '../src/Keystore.js'
import { copy } from 'fs-extra'

import KeyValueStore from '../src/kv.js'
import Database from '../src/database.js'

// Test utils
import { config, testAPIs, startIpfs, stopIpfs, getIpfsPeerId, waitForPeers, connectPeers } from 'orbit-db-test-utils'

const { sync: rmrf } = rimraf
const { createIdentity } = IdentityProvider

Object.keys(testAPIs).forEach((IPFS) => {
  describe('New Log (' + IPFS + ')', function () {
    this.timeout(config.timeout)

    const { identityKeyFixtures, signingKeyFixtures, identityKeysPath, signingKeysPath } = config

    let ipfsd1, ipfsd2
    let ipfs1, ipfs2
    let keystore, signingKeystore
    let peerId1, peerId2
    let testIdentity1, testIdentity2
    let kv1, kv2

    const databaseId = 'AAA'

    before(async () => {
      rmrf(identityKeysPath)
      rmrf(signingKeysPath)
      await copy(identityKeyFixtures, identityKeysPath)
      await copy(signingKeyFixtures, signingKeysPath)

      // Start two IPFS instances
      ipfsd1 = await startIpfs(IPFS, config.daemon1)
      ipfsd2 = await startIpfs(IPFS, config.daemon2)
      ipfs1 = ipfsd1.api
      ipfs2 = ipfsd2.api

      await connectPeers(ipfs1, ipfs2)

      // Get the peer IDs
      peerId1 = await getIpfsPeerId(ipfs1)
      peerId2 = await getIpfsPeerId(ipfs2)

      keystore = new Keystore(identityKeysPath)
      signingKeystore = new Keystore(signingKeysPath)

      // Create an identity for each peers
      testIdentity1 = await createIdentity({ id: 'userA', keystore, signingKeystore })
      testIdentity2 = await createIdentity({ id: 'userB', keystore, signingKeystore })
    })

    after(async () => {
      if (kv1) {
        await kv1.close()
      }
      if (kv2) {
        await kv2.close()
      }
      if (ipfsd1) {
        await stopIpfs(ipfsd1)
      }
      if (ipfsd2) {
        await stopIpfs(ipfsd2)
      }
      if (keystore) {
        await keystore.close()
      }
      if (signingKeystore) {
        await signingKeystore.close()
      }
      rmrf(identityKeysPath)
      rmrf(signingKeysPath)
    })

    describe('traverse', () => {
      it('returns all entries in the log', async () => {
        const accessController = {
          canAppend: (entry) => entry.identity.id === testIdentity1.id
        }

        kv1 = await KeyValueStore(Log, Database, ipfs1, testIdentity1, databaseId, accessController)
        kv2 = await KeyValueStore(Log, Database, ipfs2, testIdentity2, databaseId, accessController)

        await waitForPeers(ipfs1, [peerId2], databaseId)
        await waitForPeers(ipfs2, [peerId1], databaseId)

        await kv1.set('init', true)
        await kv1.set('hello', 'friend')
        await kv1.del('hello')
        await kv1.set('hello', 'friend2')
        await kv1.del('hello')
        await kv1.set('empty', '')
        await kv1.del('empty')
        const hash = await kv1.set('hello', 'friend3')
        const lastEntry = await kv1.database.log.get(hash)

        // const sleep = (time) => new Promise((resolve) => {
        //   setTimeout(() => {
        //     resolve()
        //   }, time)
        // })
        // await sleep(100)

        console.time('sync')
        await kv2.sync(lastEntry.bytes)
        console.timeEnd('sync')

        // write access test
        let errorMessage
        try {
          await kv2.set('hello', 'friend4')
        } catch (e) {
          errorMessage = e.message
        } finally {
          const valueNotUpdated = await kv2.get('hello')
          strictEqual(valueNotUpdated, 'friend3')
          // strictEqual(errorMessage, 'Could not append entry:\nKey "0358df8eb5def772917748fdf8a8b146581ad2041eae48d66cc6865f11783499a6" is not allowed to write to the log')
          strictEqual(errorMessage.startsWith('Could not append entry:\nKey'), true)
        }

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
        for await (const keyValue of kv2.all()) {
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
        for await (const keyValue of kv1.all()) {
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
