import { strictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { copy } from 'fs-extra'
import { Log } from '../../src/oplog/index.js'
import { Identities, KeyStore } from '../../src/index.js'
import testKeysPath from '../fixtures/test-keys-path.js'

const keysPath = './testkeys'

describe('Log - References', function () {
  this.timeout(60000)

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

  describe('References', async () => {
    it('creates entries with 1 references', async () => {
      const amount = 32
      const referencesCount = 1
      const log1 = await Log(testIdentity, { logId: 'A' })

      for (let i = 0; i < amount; i++) {
        await log1.append(i.toString(), { referencesCount })
      }

      const values1 = await log1.values()

      strictEqual(values1[values1.length - 1].refs.length, referencesCount)
    })

    it('creates entries with 2 references', async () => {
      const amount = 32
      const referencesCount = 2
      const log1 = await Log(testIdentity, { logId: 'A' })

      for (let i = 0; i < amount; i++) {
        await log1.append(i.toString(), { referencesCount })
      }

      const values1 = await log1.values()

      strictEqual(values1[values1.length - 1].refs.length, referencesCount)
    })

    it('creates entries with 4 references', async () => {
      const amount = 32
      const referencesCount = 4
      const log2 = await Log(testIdentity, { logId: 'B' })

      for (let i = 0; i < amount; i++) {
        await log2.append(i.toString(), { referencesCount })
      }

      const values2 = await log2.values()

      strictEqual(values2[values2.length - 1].refs.length, referencesCount)
    })

    it('creates entries with 8 references', async () => {
      const amount = 64
      const referencesCount = 8
      const log3 = await Log(testIdentity, { logId: 'C' })

      for (let i = 0; i < amount; i++) {
        await log3.append(i.toString(), { referencesCount })
      }

      const values3 = await log3.values()

      strictEqual(values3[values3.length - 1].refs.length, referencesCount)
    })

    it('creates entries with 16 references', async () => {
      const amount = 64
      const referencesCount = 16
      const log4 = await Log(testIdentity, { logId: 'D' })

      for (let i = 0; i < amount; i++) {
        await log4.append(i.toString(), { referencesCount })
      }

      const values4 = await log4.values()

      strictEqual(values4[values4.length - 1].refs.length, referencesCount)
    })

    it('creates entries with 32 references', async () => {
      const amount = 64
      const referencesCount = 32
      const log4 = await Log(testIdentity, { logId: 'D' })

      for (let i = 0; i < amount; i++) {
        await log4.append(i.toString(), { referencesCount })
      }

      const values4 = await log4.values()

      strictEqual(values4[values4.length - 1].refs.length, referencesCount)
    })

    it('creates entries with 64 references', async () => {
      const amount = 128
      const referencesCount = 64
      const log4 = await Log(testIdentity, { logId: 'D' })

      for (let i = 0; i < amount; i++) {
        await log4.append(i.toString(), { referencesCount })
      }

      const values4 = await log4.values()

      strictEqual(values4[values4.length - 1].refs.length, referencesCount)
    })

    it('creates entries with 128 references', async () => {
      // +2 because first ref is always skipped (covered by next field) and
      // we need 129 entries to have 128 back references
      const amount = 128 + 2
      const referencesCount = 128
      const log4 = await Log(testIdentity, { logId: 'D' })

      for (let i = 0; i < amount; i++) {
        await log4.append(i.toString(), { referencesCount })
      }

      const values4 = await log4.values()

      strictEqual(values4[values4.length - 1].refs.length, referencesCount)
    })
  })
})
