import { strictEqual, deepStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { copy } from 'fs-extra'
import { Log, Identities, KeyStore } from '../../src/index.js'
import testKeysPath from '../fixtures/test-keys-path.js'

const keysPath = './testkeys'

describe('Log - Append', function () {
  this.timeout(10000)

  let keystore
  let identities
  let testIdentity

  before(async () => {
    await copy(testKeysPath, keysPath)
    keystore = await KeyStore({ path: keysPath })
    identities = await Identities({ keystore })
    testIdentity = await identities.createIdentity({ id: 'userA' })
  })

  after(async () => {
    if (keystore) {
      await keystore.close()
    }
    await rimraf(keysPath)
  })

  describe('append', async () => {
    describe('append one', async () => {
      let log
      let values = []
      let heads = []

      before(async () => {
        log = await Log(testIdentity, { logId: 'A' })
        await log.append('hello1')
        values = await log.values()
        heads = await log.heads()
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
        heads.forEach((head) => {
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
      const referencesCount = 64

      let log
      let values = []
      let heads = []

      before(async () => {
        log = await Log(testIdentity, { logId: 'A' })
        for (let i = 0; i < amount; i++) {
          await log.append('hello' + i, { referencesCount })
        }
        values = await log.values()
        heads = await log.heads()
      })

      it('set the correct heads', () => {
        strictEqual(heads.length, 1)
        deepStrictEqual(heads[0], values[values.length - 1])
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
        values.reverse().forEach((entry, index) => {
          index = values.length - index - 1
          const expectedRefCount = index < referencesCount
            ? Math.max(0, index - 1)
            : Math.max(0, Math.min(referencesCount, index - 1))
          strictEqual(entry.refs.length, expectedRefCount)
        })
      })
    })
  })
})
