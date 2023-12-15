import { strictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { createOrbitDB } from '../src/index.js'
import createHelia from './utils/create-helia.js'

describe('Drop databases', function () {
  this.timeout(5000)

  let ipfs
  let orbitdb1
  let db

  before(async () => {
    ipfs = await createHelia()
  })

  after(async () => {
    if (ipfs) {
      await ipfs.stop()
    }
    await rimraf('./orbitdb')
    await rimraf('./ipfs')
  })

  describe('dropping a database', () => {
    const amount = 10

    before(async () => {
      orbitdb1 = await createOrbitDB({ ipfs, id: 'user1' })
      db = await orbitdb1.open('helloworld')
    })

    after(async () => {
      if (db) {
        await db.close()
      }
      if (orbitdb1) {
        await orbitdb1.stop()
      }
      await rimraf('./orbitdb')
    })

    it('returns no entries in the database after dropping it', async () => {
      for (let i = 0; i < amount; i++) {
        await db.add('hello' + i)
      }

      const before = await db.all()
      strictEqual(before.length, amount)

      await db.drop()

      const after = await db.all()
      strictEqual(after.length, 0)
    })

    it('returns no heads for the database oplog after dropping it', async () => {
      for (let i = 0; i < amount; i++) {
        await db.add('hello' + i)
      }

      const before = await db.log.heads()
      strictEqual(before.length, 1)

      await db.drop()

      const after = await db.log.heads()
      strictEqual(after.length, 0)
    })

    it('returns no entries when a dropped database is opened again after closing', async () => {
      for (let i = 0; i < amount; i++) {
        await db.add('hello' + i)
      }

      const before = await db.all()
      strictEqual(before.length, amount)

      await db.drop()
      await db.close()

      db = await orbitdb1.open('helloworld')

      const after = await db.all()
      strictEqual(after.length, 0)
    })
  })

  describe('dropping an empty database', () => {
    before(async () => {
      orbitdb1 = await createOrbitDB({ ipfs, id: 'user1' })
      db = await orbitdb1.open('helloworld')
    })

    after(async () => {
      if (db) {
        await db.drop()
        await db.close()
      }
      if (orbitdb1) {
        await orbitdb1.stop()
      }
      await rimraf('./orbitdb1')
    })

    it('doesn\'t error when dropping an empty database', async () => {
      let err
      try {
        await db.drop()
      } catch (e) {
        err = e
      }
      strictEqual(err, undefined)
    })
  })
})
