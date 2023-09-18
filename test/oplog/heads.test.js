import { strictEqual, deepStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { copy } from 'fs-extra'
import { Log, Identities, KeyStore } from '../../src/index.js'
import testKeysPath from '../fixtures/test-keys-path.js'

const keysPath = './testkeys'

const last = (arr) => {
  return arr[arr.length - 1]
}

describe('Log - Heads', function () {
  this.timeout(5000)

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

  it('finds one head after one entry', async () => {
    const log1 = await Log(testIdentity, { logId: 'A' })
    await log1.append('helloA1')
    strictEqual((await log1.heads()).length, 1)
  })

  it('finds one head after two entries', async () => {
    const log1 = await Log(testIdentity, { logId: 'A' })
    await log1.append('helloA1')
    await log1.append('helloA2')
    strictEqual((await log1.heads()).length, 1)
  })

  it('latest entry is the the head', async () => {
    const log1 = await Log(testIdentity, { logId: 'A' })
    await log1.append('helloA1')
    const entry = await log1.append('helloA2')
    deepStrictEqual(entry.hash, (await log1.heads())[0].hash)
  })

  it('finds head after a join and append', async () => {
    const log1 = await Log(testIdentity, { logId: 'A' })
    const log2 = await Log(testIdentity, { logId: 'A' })

    await log1.append('helloA1')
    await log1.append('helloA2')
    await log2.append('helloB1')

    await log2.join(log1)
    await log2.append('helloB2')
    const expectedHead = last(await log2.values())

    const heads = await log2.heads()
    strictEqual(heads.length, 1)
    deepStrictEqual(heads[0].hash, expectedHead.hash)
  })

  it('finds two heads after a join', async () => {
    const log2 = await Log(testIdentity, { logId: 'A' })
    const log1 = await Log(testIdentity, { logId: 'A' })

    await log1.append('helloA1')
    await log1.append('helloA2')
    const expectedHead1 = last(await log1.values())

    await log2.append('helloB1')
    await log2.append('helloB2')
    const expectedHead2 = last(await log2.values())

    await log1.join(log2)

    const heads = await log1.heads()
    strictEqual(heads.length, 2)
    strictEqual(heads[0].hash, expectedHead2.hash)
    strictEqual(heads[1].hash, expectedHead1.hash)
  })

  it('finds two heads after two joins', async () => {
    const log1 = await Log(testIdentity, { logId: 'A' })
    const log2 = await Log(testIdentity, { logId: 'A' })

    await log1.append('helloA1')
    await log1.append('helloA2')

    await log2.append('helloB1')
    await log2.append('helloB2')

    await log1.join(log2)

    await log2.append('helloB3')

    await log1.append('helloA3')
    await log1.append('helloA4')
    const expectedHead2 = last(await log2.values())
    const expectedHead1 = last(await log1.values())

    await log1.join(log2)

    const heads = await log1.heads()
    strictEqual(heads.length, 2)
    strictEqual(heads[0].hash, expectedHead1.hash)
    strictEqual(heads[1].hash, expectedHead2.hash)
  })

  it('finds two heads after three joins', async () => {
    const log1 = await Log(testIdentity, { logId: 'A' })
    const log2 = await Log(testIdentity, { logId: 'A' })
    const log3 = await Log(testIdentity, { logId: 'A' })

    await log1.append('helloA1')
    await log1.append('helloA2')
    await log2.append('helloB1')
    await log2.append('helloB2')
    await log1.join(log2)
    await log1.append('helloA3')
    await log1.append('helloA4')
    const expectedHead1 = last(await log1.values())
    await log3.append('helloC1')
    await log3.append('helloC2')
    await log2.join(log3)
    await log2.append('helloB3')
    const expectedHead2 = last(await log2.values())
    await log1.join(log2)

    const heads = await log1.heads()
    strictEqual(heads.length, 2)
    strictEqual(heads[0].hash, expectedHead1.hash)
    strictEqual(heads[1].hash, expectedHead2.hash)
  })

  it('finds three heads after three joins', async () => {
    const log1 = await Log(testIdentity, { logId: 'A' })
    const log2 = await Log(testIdentity, { logId: 'A' })
    const log3 = await Log(testIdentity, { logId: 'A' })

    await log1.append('helloA1')
    await log1.append('helloA2')
    await log2.append('helloB1')
    await log2.append('helloB2')
    await log1.join(log2)
    await log1.append('helloA3')
    await log1.append('helloA4')
    const expectedHead1 = last(await log1.values())
    await log3.append('helloC1')
    await log2.append('helloB3')
    await log3.append('helloC2')
    const expectedHead2 = last(await log2.values())
    const expectedHead3 = last(await log3.values())
    await log1.join(log2)
    await log1.join(log3)

    const heads = await log1.heads()
    strictEqual(heads.length, 3)
    deepStrictEqual(heads[0].hash, expectedHead1.hash)
    deepStrictEqual(heads[1].hash, expectedHead2.hash)
    deepStrictEqual(heads[2].hash, expectedHead3.hash)
  })
})
