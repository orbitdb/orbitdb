import { deepStrictEqual } from 'assert'
import { copy } from 'fs-extra'
import { rimraf } from 'rimraf'
import { createOrbitDB } from '../src/index.js'
import createHelia from './utils/create-helia.js'

describe('Migrations', function () {
  this.timeout(10000)

  let ipfs
  let orbitdb

  const fixturesPath = './test/fixtures/pre-2.5.0'
  const testDir = './test-heads-migration'

  before(async () => {
    await copy(fixturesPath, testDir)
    ipfs = await createHelia({ directory: `${testDir}/ipfs` })
    orbitdb = await createOrbitDB({ ipfs, id: 'user1', directory: `${testDir}/orbitdb` })
  })

  after(async () => {
    await orbitdb.stop()
    await ipfs.blockstore.child.child.child.close()
    await ipfs.stop()
    await rimraf(testDir)
  })

  it('migrates the heads database from pre 2.5.0 to 2.5.0 format', async () => {
    const db = await orbitdb.open('/orbitdb/zdpuAoE5P3f5zsPGkNDVgK4XF61oyE5c5JY6Yz5d74oWFCYES')

    const res = []

    for await (const event of db.iterator()) {
      res.unshift(event)
    }

    deepStrictEqual(res.length, 129)
  })

  it('can read the database after migration to 2.5.0 format', async () => {
    const db = await orbitdb.open('/orbitdb/zdpuAoE5P3f5zsPGkNDVgK4XF61oyE5c5JY6Yz5d74oWFCYES')

    const res = []

    for await (const event of db.iterator()) {
      res.unshift(event)
    }

    deepStrictEqual(res.length, 129)
  })
})
