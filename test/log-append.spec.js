import { strictEqual, deepStrictEqual } from 'assert'
import rimraf from 'rimraf'
import { copy } from 'fs-extra'
import { Log } from '../src/log.js'
import IdentityProvider from 'orbit-db-identity-provider'
import Keystore from '../src/Keystore.js'

// Test utils
import { config, testAPIs } from 'orbit-db-test-utils'

const { createIdentity } = IdentityProvider
const { sync: rmrf } = rimraf

let testIdentity

Object.keys(testAPIs).forEach((IPFS) => {
  describe('Log - Append (' + IPFS + ')', function () {
    this.timeout(config.timeout)

    const { identityKeyFixtures, signingKeyFixtures, identityKeysPath, signingKeysPath } = config

    let keystore, signingKeystore

    before(async () => {
      rmrf(identityKeysPath)
      rmrf(signingKeysPath)
      await copy(identityKeyFixtures, identityKeysPath)
      await copy(signingKeyFixtures, signingKeysPath)

      keystore = new Keystore(identityKeysPath)
      signingKeystore = new Keystore(signingKeysPath)

      testIdentity = await createIdentity({ id: 'userA', keystore, signingKeystore })
    })

    after(async () => {
      rmrf(identityKeysPath)
      rmrf(signingKeysPath)

      await keystore.close()
      await signingKeystore.close()
    })

    describe('append', () => {
      describe('append one', async () => {
        let log
        let values = []

        before(async () => {
          log = Log(testIdentity, 'A')
          await log.append('hello1')
          values = await log.values()
        })

        it('added the correct amount of items', () => {
          strictEqual(values.length, 1)
        })

        it('added the correct values', async () => {
          values.forEach((entry) => {
            strictEqual(entry.payload, 'hello1')
          })
        })

        it('added the correct amount of next pointers', async () => {
          values.forEach((entry) => {
            strictEqual(entry.next.length, 0)
          })
        })

        it('has the correct heads', async () => {
          log.heads().forEach((head) => {
            strictEqual(head.hash, values[0].hash)
          })
        })

        it('updated the clocks correctly', async () => {
          values.forEach((entry) => {
            strictEqual(entry.clock.id, testIdentity.publicKey)
            strictEqual(entry.clock.time, 1)
          })
        })
      })

      describe('append 100 items to a log', async () => {
        const amount = 100
        const nextPointerAmount = 64

        let log
        let values = []

        before(async () => {
          log = Log(testIdentity, 'A')
          for (let i = 0; i < amount; i++) {
            await log.append('hello' + i, { pointerCount: nextPointerAmount })
            // Make sure the log has the right heads after each append
            values = await log.values()
            strictEqual(log.heads().length, 1)
            deepStrictEqual(log.heads()[0], values[values.length - 1])
          }
        })

        it('added the correct amount of items', () => {
          strictEqual(values.length, amount)
        })

        it('added the correct values', async () => {
          values.forEach((entry, index) => {
            strictEqual(entry.payload, 'hello' + index)
          })
        })

        it('updated the clocks correctly', async () => {
          values.forEach((entry, index) => {
            strictEqual(entry.clock.time, index + 1)
            strictEqual(entry.clock.id, testIdentity.publicKey)
          })
        })

        it('added the correct amount of refs pointers', async () => {
          values.forEach((entry, index) => {
            strictEqual(entry.refs.length, index > 0 ? Math.floor(Math.log2(Math.min(nextPointerAmount, index))) : 0)
          })
        })
      })
    })
  })
})
