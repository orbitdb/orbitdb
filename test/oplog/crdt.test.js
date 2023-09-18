import { strictEqual, deepStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { copy } from 'fs-extra'
import { Log, Identities, KeyStore } from '../../src/index.js'
import testKeysPath from '../fixtures/test-keys-path.js'

const keysPath = './testkeys'

let testIdentity, testIdentity2, testIdentity3

describe('Log - CRDT', function () {
  this.timeout(5000)

  let keystore
  let identities1

  before(async () => {
    await copy(testKeysPath, keysPath)
    keystore = await KeyStore({ path: keysPath })
    identities1 = await Identities({ keystore })
    testIdentity = await identities1.createIdentity({ id: 'userA' })
    testIdentity2 = await identities1.createIdentity({ id: 'userB' })
    testIdentity3 = await identities1.createIdentity({ id: 'userC' })
  })

  after(async () => {
    if (keystore) {
      await keystore.close()
    }
    await rimraf(keysPath)
  })

  describe('is a CRDT', async () => {
    const logId = 'X'

    let log1, log2, log3

    beforeEach(async () => {
      log1 = await Log(testIdentity, { logId })
      log2 = await Log(testIdentity2, { logId })
      log3 = await Log(testIdentity3, { logId })
    })

    it('join is associative', async () => {
      const expectedElementsCount = 6

      await log1.append('helloA1')
      await log1.append('helloA2')
      await log2.append('helloB1')
      await log2.append('helloB2')
      await log3.append('helloC1')
      await log3.append('helloC2')

      // a + (b + c)
      await log2.join(log3)
      await log1.join(log2)

      const res1 = await log1.values()

      log1 = await Log(testIdentity, { logId })
      log2 = await Log(testIdentity2, { logId })
      log3 = await Log(testIdentity3, { logId })
      await log1.append('helloA1')
      await log1.append('helloA2')
      await log2.append('helloB1')
      await log2.append('helloB2')
      await log3.append('helloC1')
      await log3.append('helloC2')

      // (a + b) + c
      await log1.join(log2)
      await log3.join(log1)

      const res2 = await log3.values()

      // associativity: a + (b + c) == (a + b) + c
      strictEqual(res1.length, expectedElementsCount)
      strictEqual(res2.length, expectedElementsCount)
      deepStrictEqual(res1.map(e => e.hash), res2.map(e => e.hash))
    })

    it('join is commutative', async () => {
      const expectedElementsCount = 4

      await log1.append('helloA1')
      await log1.append('helloA2')
      await log2.append('helloB1')
      await log2.append('helloB2')

      // b + a
      await log2.join(log1)
      const res1 = await log2.values()

      log1 = await Log(testIdentity, { logId })
      log2 = await Log(testIdentity2, { logId })
      await log1.append('helloA1')
      await log1.append('helloA2')
      await log2.append('helloB1')
      await log2.append('helloB2')

      // a + b
      await log1.join(log2)
      const res2 = await log1.values()

      // commutativity: a + b == b + a
      strictEqual(res1.length, expectedElementsCount)
      strictEqual(res2.length, expectedElementsCount)
      deepStrictEqual(res1.map(e => e.hash), res2.map(e => e.hash))
    })

    it('multiple joins are commutative', async () => {
      // b + a == a + b
      log1 = await Log(testIdentity, { logId })
      log2 = await Log(testIdentity2, { logId })
      await log1.append('helloA1')
      await log1.append('helloA2')
      await log2.append('helloB1')
      await log2.append('helloB2')
      await log2.join(log1)
      const resA1 = await log2.values()

      log1 = await Log(testIdentity, { logId })
      log2 = await Log(testIdentity2, { logId })
      await log1.append('helloA1')
      await log1.append('helloA2')
      await log2.append('helloB1')
      await log2.append('helloB2')
      await log1.join(log2)
      const resA2 = await log1.values()

      deepStrictEqual(resA1.map(e => e.hash), resA2.map(e => e.hash))

      // a + b == b + a
      log1 = await Log(testIdentity, { logId })
      log2 = await Log(testIdentity2, { logId })
      await log1.append('helloA1')
      await log1.append('helloA2')
      await log2.append('helloB1')
      await log2.append('helloB2')
      await log1.join(log2)
      const resB1 = await log1.values()

      log1 = await Log(testIdentity, { logId })
      log2 = await Log(testIdentity2, { logId })
      await log1.append('helloA1')
      await log1.append('helloA2')
      await log2.append('helloB1')
      await log2.append('helloB2')
      await log2.join(log1)
      const resB2 = await log2.values()

      deepStrictEqual(resB1.map(e => e.hash), resB2.map(e => e.hash))

      // a + c == c + a
      log1 = await Log(testIdentity, { logId })
      log3 = await Log(testIdentity3, { logId })
      await log1.append('helloA1')
      await log1.append('helloA2')
      await log3.append('helloC1')
      await log3.append('helloC2')
      await log3.join(log1)
      const resC1 = await log3.values()

      log1 = await Log(testIdentity, { logId })
      log3 = await Log(testIdentity3, { logId })
      await log1.append('helloA1')
      await log1.append('helloA2')
      await log3.append('helloC1')
      await log3.append('helloC2')
      await log1.join(log3)
      const resC2 = await log1.values()

      deepStrictEqual(resC1.map(e => e.hash), resC2.map(e => e.hash))

      // c + b == b + c
      log2 = await Log(testIdentity2, { logId })
      log3 = await Log(testIdentity3, { logId })

      await log2.append('helloB1')
      await log2.append('helloB2')
      await log3.append('helloC1')
      await log3.append('helloC2')
      await log3.join(log2)
      const resD1 = await log3.values()

      log2 = await Log(testIdentity2, { logId })
      log3 = await Log(testIdentity3, { logId })
      await log2.append('helloB1')
      await log2.append('helloB2')
      await log3.append('helloC1')
      await log3.append('helloC2')
      await log2.join(log3)
      const resD2 = await log2.values()

      deepStrictEqual(resD1.map(e => e.hash), resD2.map(e => e.hash))

      // a + b + c == c + b + a
      log1 = await Log(testIdentity, { logId })
      log2 = await Log(testIdentity2, { logId })
      log3 = await Log(testIdentity3, { logId })
      await log1.append('helloA1')
      await log1.append('helloA2')
      await log2.append('helloB1')
      await log2.append('helloB2')
      await log3.append('helloC1')
      await log3.append('helloC2')
      await log1.join(log2)
      await log1.join(log3)
      const logLeft = await log1.values()

      log1 = await Log(testIdentity, { logId })
      log2 = await Log(testIdentity2, { logId })
      log3 = await Log(testIdentity3, { logId })
      await log1.append('helloA1')
      await log1.append('helloA2')
      await log2.append('helloB1')
      await log2.append('helloB2')
      await log3.append('helloC1')
      await log3.append('helloC2')
      await log3.join(log2)
      await log3.join(log1)
      const logRight = await log3.values()

      deepStrictEqual(logLeft.map(e => e.hash), logRight.map(e => e.hash))
    })

    it('join is idempotent', async () => {
      const expectedElementsCount = 3

      const logA = await Log(testIdentity, { logId })
      await logA.append('helloA1')
      await logA.append('helloA2')
      await logA.append('helloA3')

      // idempotence: a + a = a
      await logA.join(logA)
      const values = await logA.values()

      strictEqual(values.length, expectedElementsCount)
    })
  })
})
