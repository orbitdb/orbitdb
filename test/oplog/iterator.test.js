import { strictEqual, deepStrictEqual } from 'assert'
import all from 'it-all'
import { rimraf } from 'rimraf'
import { copy } from 'fs-extra'
import { Log, Identities, KeyStore } from '../../src/index.js'
import LogCreator from './utils/log-creator.js'
import testKeysPath from '../fixtures/test-keys-path.js'

const { createLogWithSixteenEntries } = LogCreator

const keysPath = './testkeys'

describe('Log - Iterator', function () {
  this.timeout(5000)

  let keystore
  let identities1, identities2, identities3
  let testIdentity, testIdentity2, testIdentity3

  before(async () => {
    await copy(testKeysPath, keysPath)
    keystore = await KeyStore({ path: keysPath })
    identities1 = await Identities({ keystore })
    identities2 = await Identities({ keystore })
    identities3 = await Identities({ keystore })
    testIdentity = await identities1.createIdentity({ id: 'userC' })
    testIdentity2 = await identities2.createIdentity({ id: 'userB' })
    testIdentity3 = await identities3.createIdentity({ id: 'userC' })
  })

  after(async () => {
    if (keystore) {
      await keystore.close()
    }
    await rimraf(keysPath)
  })

  describe('Basic iterator functionality', async () => {
    let log1
    let startHash
    const hashes = []
    const logSize = 100
    const startIndex = 67

    beforeEach(async () => {
      log1 = await Log(testIdentity, { logId: 'X' })

      for (let i = 0; i < logSize; i++) {
        const entry = await log1.append('entry' + i)
        hashes.push([entry.hash, hashes.length])
      }

      // entry67
      // startHash = 'zdpuAxCuaH2R7AYKZ6ZBeeA94v3FgmHZ8wCfDy7pLVcoc3zSo'
      startHash = hashes[startIndex][0]
      strictEqual(startHash, hashes[startIndex][0])
    })

    it('returns length with lte and amount', async () => {
      const amount = 10

      const it = log1.iterator({
        lte: startHash,
        amount
      })

      const result = await all(it)

      strictEqual([...result].length, 10)
      strictEqual(result[0].hash, startHash)
    })

    it('returns entries with lte and amount', async () => {
      const amount = 10

      const it = log1.iterator({
        lte: startHash,
        amount
      })

      let i = 0
      for await (const entry of it) {
        strictEqual(entry.payload, 'entry' + (67 - i++))
      }

      strictEqual(i, amount)
    })

    it('returns length with lt and amount', async () => {
      const amount = 10

      const it = log1.iterator({
        lt: startHash,
        amount
      })

      const result = await all(it)

      strictEqual([...result].length, amount)
    })

    it('returns entries with lt and amount', async () => {
      const amount = 10

      const it = log1.iterator({
        lt: startHash,
        amount
      })

      let i = 0
      for await (const entry of it) {
        strictEqual(entry.payload, 'entry' + (66 - i++))
      }

      strictEqual(i, amount)
    })

    it('returns correct length with gt and amount', async () => {
      const amount = 5

      const it = log1.iterator({
        gt: startHash,
        amount
      })

      let i = 0
      for await (const entry of it) {
        strictEqual(entry.payload, 'entry' + (72 - i++))
      }

      strictEqual(i, amount)
    })

    it('returns length with gte and amount', async () => {
      const amount = 12

      const it = log1.iterator({
        gte: startHash,
        amount
      })

      const result = await all(it)

      strictEqual([...result].length, amount)
      strictEqual(result[result.length - 1].hash, startHash)
    })

    it('returns entries with gte and amount', async () => {
      const amount = 12

      const it = log1.iterator({
        gte: startHash,
        amount
      })

      let i = 0
      for await (const entry of it) {
        strictEqual(entry.payload, 'entry' + (78 - i++))
      }

      strictEqual(i, amount)
    })

    it('iterates with lt and gt', async () => {
      const expectedHashes = hashes.slice().slice(0, 12).map(e => e[0])
      const it = log1.iterator({
        gt: expectedHashes[0],
        lt: expectedHashes[expectedHashes.length - 1]
      })
      const result = await all(it)
      const hashes_ = await Promise.all([...result.reverse()].map(e => e.hash))

      strictEqual(hashes_.length, 10)

      let i = 0
      for (const h of hashes_) {
        strictEqual(expectedHashes[i + 1], h)
        i++
      }
      strictEqual(i, 10)
    })

    it('iterates with lt and gte', async () => {
      const expectedHashes = hashes.slice().slice(0, 26).map(e => e[0])
      const it = log1.iterator({
        gte: expectedHashes[0],
        lt: expectedHashes[expectedHashes.length - 1]
      })
      const result = await all(it)
      const hashes_ = await Promise.all([...result].map(e => e.hash))

      strictEqual(hashes_.length, 25)
      strictEqual(hashes_.indexOf(expectedHashes[0]), 24)
      strictEqual(hashes_.indexOf(expectedHashes[expectedHashes.length - 1]), -1)
      strictEqual(hashes_.indexOf(expectedHashes[expectedHashes.length - 2]), 0)

      let i = 0
      for (const h of hashes_) {
        strictEqual(expectedHashes[expectedHashes.length - 2 - i], h)
        i++
      }
      strictEqual(i, 25)
    })

    it('iterates with lte and gt', async () => {
      const expectedHashes = hashes.slice().slice(0, 5).map(e => e[0])
      const it = log1.iterator({
        gt: expectedHashes[0],
        lte: expectedHashes[expectedHashes.length - 1]
      })
      const result = await all(it)
      const hashes_ = await Promise.all([...result].map(e => e.hash))

      strictEqual(hashes_.length, 4)
      strictEqual(hashes_.indexOf(expectedHashes[0]), -1)
      strictEqual(hashes_.indexOf(expectedHashes[expectedHashes.length - 1]), 0)
      strictEqual(hashes_.indexOf(expectedHashes[expectedHashes.length - 2]), 1)
      strictEqual(hashes_.indexOf(expectedHashes[expectedHashes.length - 3]), 2)
      strictEqual(hashes_.indexOf(expectedHashes[expectedHashes.length - 4]), 3)
    })

    it('iterates with lte and gte', async () => {
      const expectedHashes = hashes.slice().slice(0, 10).map(e => e[0])
      const it = log1.iterator({
        gte: expectedHashes[0],
        lte: expectedHashes[expectedHashes.length - 1]
      })
      const result = await all(it)
      const hashes_ = await Promise.all([...result].map(e => e.hash))

      strictEqual(hashes_.length, 10)
      strictEqual(hashes_.indexOf(expectedHashes[0]), 9)
      strictEqual(hashes_.indexOf(expectedHashes[expectedHashes.length - 1]), 0)

      let i = 0
      for (const h of hashes_) {
        strictEqual(expectedHashes[expectedHashes.length - 1 - i], h)
        i++
      }
      strictEqual(i, 10)
    })

    it('iterates the full log by default', async () => {
      const expectedHashes = hashes.slice().map(e => e[0])
      const it = log1.iterator({})
      const result = await all(it)
      const hashes_ = await Promise.all([...result].map(e => e.hash))

      strictEqual(hashes_.length, logSize)

      let i = 0
      for (const h of hashes_) {
        strictEqual(expectedHashes[expectedHashes.length - 1 - i], h)
        i++
      }

      strictEqual(i, logSize)
    })

    it('iterates the full log with gte and lte and amount', async () => {
      const expectedHashes = hashes.slice().map(e => e[0])
      const it = log1.iterator({
        gte: expectedHashes[0],
        lte: expectedHashes[expectedHashes.length - 1],
        amount: logSize
      })
      const result = await all(it)
      const hashes_ = await Promise.all([...result].map(e => e.hash))

      strictEqual(hashes_.length, logSize)

      let i = 0
      for (const h of hashes_) {
        strictEqual(expectedHashes[expectedHashes.length - 1 - i], h)
        i++
      }

      strictEqual(i, logSize)
    })

    it('returns length with gt and default amount', async () => {
      const it = log1.iterator({
        gt: startHash
      })

      const result = await all(it)

      strictEqual([...result].length, 32)
    })

    it('returns entries with gt and default amount', async () => {
      const it = log1.iterator({
        gt: startHash
      })

      let i = 0
      for await (const entry of it) {
        strictEqual(entry.payload, 'entry' + (logSize - 1 - i++))
      }

      strictEqual(i, 32)
    })

    it('returns length with gte and default amount', async () => {
      const it = await log1.iterator({
        gte: startHash
      })

      const result = await all(it)

      strictEqual([...result].length, 33)
    })

    it('returns entries with gte and default amount', async () => {
      const it = log1.iterator({
        gte: startHash
      })

      let i = 0
      for await (const entry of it) {
        strictEqual(entry.payload, 'entry' + (logSize - 1 - i++))
      }

      strictEqual(i, 33)
    })

    it('returns length with lt and default amount value', async () => {
      const it = log1.iterator({
        lt: startHash
      })

      const result = await all(it)

      strictEqual([...result].length, 67)
    })

    it('returns entries with lt and default amount value', async () => {
      const it = log1.iterator({
        lt: startHash
      })

      let i = 0
      for await (const entry of it) {
        strictEqual(entry.payload, 'entry' + (66 - i++))
      }
      strictEqual(i, 67)
    })

    it('returns length with lte and default amount value', async () => {
      const it = log1.iterator({
        lte: startHash
      })

      const result = await all(it)

      strictEqual([...result].length, 68)
    })

    it('returns entries with lte and default amount value', async () => {
      const it = log1.iterator({
        lte: startHash
      })

      let i = 0
      for await (const entry of it) {
        strictEqual(entry.payload, 'entry' + (67 - i++))
      }

      strictEqual(i, 68)
    })

    it('returns correct entries with gt when amount is more than total entries', async () => {
      const amount = logSize - startIndex
      const expectedAmount = logSize - startIndex - 1

      const it = log1.iterator({
        gt: startHash,
        amount
      })

      let i = 0
      for await (const entry of it) {
        strictEqual(entry.payload, 'entry' + (logSize - 1 - i++))
      }

      strictEqual(i, expectedAmount)
    })

    it('returns correct entries with gte when amount is more than total entries', async () => {
      const amount = logSize - startIndex + 1
      const expectedAmount = amount - 1

      const it = log1.iterator({
        gte: startHash,
        amount
      })

      let i = 0
      for await (const entry of it) {
        strictEqual(entry.payload, 'entry' + (logSize - 1 - i++))
      }

      strictEqual(i, expectedAmount)
    })

    it('returns zero entries when amount is 0', async () => {
      const it = log1.iterator({
        amount: 0
      })

      let i = 0
      for await (const entry of it) { // eslint-disable-line no-unused-vars
        i++
      }

      strictEqual(i, 0)
    })
  })

  describe('Iteration over forked/joined logs', async () => {
    let fixture, identities, heads

    before(async () => {
      identities = [testIdentity3, testIdentity2, testIdentity3, testIdentity]
      fixture = await createLogWithSixteenEntries(Log, null, identities)
      heads = await fixture.log.heads()
    })

    it('returns the full length from all heads', async () => {
      const it = fixture.log.iterator({
        lte: heads
      })

      const result = await all(it)

      strictEqual([...result].length, 16)
    })

    it('returns partial entries from all heads', async () => {
      const it = fixture.log.iterator({
        lte: heads,
        amount: 6
      })

      const result = await all(it)

      deepStrictEqual([...result].map(e => e.payload),
        ['entryA10', 'entryA9', 'entryA8', 'entryA7', 'entryC0', 'entryA6'])
    })

    it('returns partial logs from single heads #1', async () => {
      const it = fixture.log.iterator({
        lte: [heads[0]]
      })

      const result = await all(it)

      strictEqual([...result].length, 10)
    })

    it('returns partial logs from single heads #2', async () => {
      const it = fixture.log.iterator({
        lte: [heads[1]]
      })

      const result = await all(it)

      strictEqual([...result].length, 11)
    })

    it('throws error if lte not a string or array of entries', async () => {
      let errMsg

      try {
        const it = fixture.log.iterator({
          lte: false
        })
        await all(it)
      } catch (e) {
        errMsg = e.message
      }

      strictEqual(errMsg, 'lte must be a string or an array of Entries')
    })

    it('throws error if lt not a string or array of entries', async () => {
      let errMsg

      try {
        const it = fixture.log.iterator({
          lt: {}
        })
        await all(it)
      } catch (e) {
        errMsg = e.message
      }

      strictEqual(errMsg, 'lt must be a string or an array of Entries')
    })
  })
})
