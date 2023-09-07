import { strictEqual, deepStrictEqual, notStrictEqual } from 'assert'
import rmrf from 'rimraf'
import * as IPFS from 'ipfs-core'
import { getDatabaseType } from '../src/databases/index.js'
import { createOrbitDB, useDatabaseType, Database } from '../src/index.js'
import config from './config.js'

const type = 'custom!'

const CustomStore = () => async ({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate }) => {
  const database = await Database({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate })

  return {
    ...database,
    type
  }
}

CustomStore.type = type

describe('Add a custom database type', function () {
  this.timeout(5000)

  let ipfs
  let orbitdb

  before(async () => {
    ipfs = await IPFS.create({ ...config.daemon1, repo: './ipfs1' })
    orbitdb = await createOrbitDB({ ipfs })
  })

  after(async () => {
    if (orbitdb) {
      await orbitdb.stop()
    }

    if (ipfs) {
      await ipfs.stop()
    }

    await rmrf('./orbitdb')
    await rmrf('./ipfs1')
  })

  describe('Default supported database types', function () {
    it('throws and error if custom database type hasn\'t been added', async () => {
      let err
      try {
        await orbitdb.open('hello', { type })
      } catch (e) {
        err = e
      }
      notStrictEqual(err, undefined)
      strictEqual(err.message, 'Unsupported database type: \'custom!\'')
    })
  })

  describe('Custom database type', function () {
    before(() => {
      useDatabaseType(CustomStore)
    })

    it('create a database with the custom database type', async () => {
      const name = 'hello custom database'
      const db = await orbitdb.open(name, { type })
      strictEqual(db.type, type)
      strictEqual(db.name, name)
    })

    it('returns custom database type after adding it', async () => {
      deepStrictEqual(getDatabaseType(type), CustomStore)
    })
  })
})
