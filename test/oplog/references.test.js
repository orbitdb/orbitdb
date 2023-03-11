import { strictEqual } from 'assert'
import rmrf from 'rimraf'
import { copy } from 'fs-extra'
import { Log } from '../../src/oplog/index.js'
import { Identities, KeyStore, MemoryStorage } from '../../src/index.js'
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
    await rmrf(keysPath)
  })

  describe('References', async () => {
    const amount = 64

    it('creates entries with 2 references', async () => {
      const maxReferenceDistance = 2
      const log1 = await Log(testIdentity, { logId: 'A' })

      for (let i = 0; i < amount; i++) {
        await log1.append(i.toString(), { pointerCount: maxReferenceDistance })
      }

      const values1 = await log1.values()

      strictEqual(values1[values1.length - 1].refs.length, 1)
    })

    it('creates entries with 4 references', async () => {
      const maxReferenceDistance = 2
      const log2 = await Log(testIdentity, { logId: 'B' })

      for (let i = 0; i < amount * 2; i++) {
        await log2.append(i.toString(), { pointerCount: Math.pow(maxReferenceDistance, 2) })
      }

      const values2 = await log2.values()

      strictEqual(values2[values2.length - 1].refs.length, 2)
    })

    it('creates entries with 8 references', async () => {
      const maxReferenceDistance = 2
      const log3 = await Log(testIdentity, { logId: 'C' })

      for (let i = 0; i < amount * 3; i++) {
        await log3.append(i.toString(), { pointerCount: Math.pow(maxReferenceDistance, 3) })
      }

      const values3 = await log3.values()

      strictEqual(values3[values3.length - 1].refs.length, 3)
    })

    it('creates entries with 16 references', async () => {
      const maxReferenceDistance = 2
      const log4 = await Log(testIdentity, { logId: 'D' })

      for (let i = 0; i < amount * 4; i++) {
        await log4.append(i.toString(), { pointerCount: Math.pow(maxReferenceDistance, 4) })
      }

      const values4 = await log4.values()

      strictEqual(values4[values4.length - 1].refs.length, 4)
    })

    const inputs = [
      { amount: 1, referenceCount: 1, refLength: 0 },
      { amount: 1, referenceCount: 2, refLength: 0 },
      { amount: 2, referenceCount: 1, refLength: 1 },
      { amount: 2, referenceCount: 2, refLength: 1 },
      { amount: 3, referenceCount: 2, refLength: 1 },
      { amount: 3, referenceCount: 4, refLength: 1 },
      { amount: 4, referenceCount: 4, refLength: 2 },
      { amount: 4, referenceCount: 4, refLength: 2 },
      { amount: 32, referenceCount: 4, refLength: 2 },
      { amount: 32, referenceCount: 8, refLength: 3 },
      { amount: 32, referenceCount: 16, refLength: 4 },
      { amount: 18, referenceCount: 32, refLength: 5 },
      { amount: 128, referenceCount: 32, refLength: 5 },
      { amount: 63, referenceCount: 64, refLength: 5 },
      { amount: 64, referenceCount: 64, refLength: 6 },
      { amount: 65, referenceCount: 64, refLength: 6 },
      { amount: 91, referenceCount: 64, refLength: 6 },
      { amount: 128, referenceCount: 64, refLength: 6 },
      { amount: 128, referenceCount: 1, refLength: 0 },
      { amount: 128, referenceCount: 2, refLength: 1 },
      { amount: 256, referenceCount: 1, refLength: 0 },
      { amount: 256, referenceCount: 4, refLength: 2 },
      { amount: 256, referenceCount: 8, refLength: 3 },
      { amount: 256, referenceCount: 16, refLength: 4 },
      { amount: 256, referenceCount: 32, refLength: 5 },
      { amount: 1024, referenceCount: 2, refLength: 1 }
    ]

    inputs.forEach(input => {
      it(`has ${input.refLength} references, max distance ${input.referenceCount}, total of ${input.amount} entries`, async () => {
        const test = async (amount, referenceCount, refLength) => {
          const storage = await MemoryStorage()
          const log1 = await Log(testIdentity, { logId: 'A', storage })
          for (let i = 0; i < amount; i++) {
            await log1.append((i + 1).toString(), { pointerCount: referenceCount })
          }

          const values = await log1.values()

          strictEqual(values.length, input.amount)
          strictEqual(values[values.length - 1].clock.time, input.amount)

          for (let k = 0; k < input.amount; k++) {
            const idx = values.length - k - 1
            strictEqual(values[idx].clock.time, idx + 1)

            // Check the first ref (distance 2)
            if (values[idx].refs.length > 0) { strictEqual(values[idx].refs[0], values[idx - 2].hash) }

            // Check the second ref (distance 4)
            if (values[idx].refs.length > 1 && idx > referenceCount) { strictEqual(values[idx].refs[1], values[idx - 4].hash) }

            // Check the third ref (distance 8)
            if (values[idx].refs.length > 2 && idx > referenceCount) { strictEqual(values[idx].refs[2], values[idx - 8].hash) }

            // Check the fourth ref (distance 16)
            if (values[idx].refs.length > 3 && idx > referenceCount) { strictEqual(values[idx].refs[3], values[idx - 16].hash) }

            // Check the fifth ref (distance 32)
            if (values[idx].refs.length > 4 && idx > referenceCount) { strictEqual(values[idx].refs[4], values[idx - 32].hash) }

            // Check the fifth ref (distance 64)
            if (values[idx].refs.length > 5 && idx > referenceCount) { strictEqual(values[idx].refs[5], values[idx - 64].hash) }

            // Check the reference of each entry
            if (idx > referenceCount) { strictEqual(values[idx].refs.length, refLength) }
          }
        }

        await test(input.amount, input.referenceCount, input.refLength)
      })
    })
  })
})
