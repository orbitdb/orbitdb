import { strictEqual, deepStrictEqual } from 'assert'
import { Log } from '../../src/oplog/index.js'
import { Identities } from '../../src/identities/index.js'
import KeyStore from '../../src/key-store.js'
import { config, testAPIs } from 'orbit-db-test-utils'
import testKeysPath from '../fixtures/test-keys-path.js '

let testIdentity, testIdentity2

Object.keys(testAPIs).forEach(IPFS => {
  describe('Log - Join Concurrent Entries (' + IPFS + ')', function () {
    this.timeout(config.timeout)

    let keystore
    let identities1

    before(async () => {
      keystore = await KeyStore({ path: testKeysPath })

      identities1 = await Identities({ keystore })
      testIdentity = await identities1.createIdentity({ id: 'userA' })
      testIdentity2 = await identities1.createIdentity({ id: 'userB' })
    })

    after(async () => {
      await keystore.close()
    })

    describe('join ', async () => {
      let log1, log2

      before(async () => {
        log1 = await Log(testIdentity, { logId: 'A' })
        log2 = await Log(testIdentity2, { logId: 'A' })
      })

      it('joins consistently', async () => {
        for (let i = 0; i < 10; i++) {
          await log1.append('hello1-' + i)
          await log2.append('hello2-' + i)
        }

        await log1.join(log2)
        await log2.join(log1)

        const values1 = await log1.values()
        const values2 = await log2.values()

        strictEqual(values1.length, 20)
        strictEqual(values2.length, 20)
        deepStrictEqual(values1.map(e => e.payload && e.hash), values2.map(e => e.payload && e.hash))
      })

      it('Concurrently appending same payload after join results in same state', async () => {
        for (let i = 10; i < 20; i++) {
          await log1.append('hello1-' + i)
          await log2.append('hello2-' + i)
        }

        await log1.join(log2)
        await log2.join(log1)

        await log1.append('same')
        await log2.append('same')

        const values1 = await log1.values()
        const values2 = await log2.values()

        strictEqual(values1.length, 41)
        strictEqual(values2.length, 41)
      })

      it('Joining after concurrently appending same payload joins entry once', async () => {
        await log1.join(log2)
        await log2.join(log1)

        const values1 = await log1.values()
        const values2 = await log2.values()

        strictEqual(values1.length, 42)
        strictEqual(values2.length, 42)
        deepStrictEqual(values1.map(e => e.payload && e.hash), values2.map(e => e.payload && e.hash))
      })
    })
  })
})
