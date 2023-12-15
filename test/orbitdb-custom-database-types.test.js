import { strictEqual, deepStrictEqual, notStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { existsSync } from 'fs'
import { getDatabaseType } from '../src/databases/index.js'
import { createOrbitDB, useDatabaseType, Database, KeyValueIndexed } from '../src/index.js'
import pathJoin from '../src/utils/path-join.js'
import createHelia from './utils/create-helia.js'

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
    ipfs = await createHelia()
    orbitdb = await createOrbitDB({ ipfs })
  })

  after(async () => {
    if (orbitdb) {
      await orbitdb.stop()
    }

    if (ipfs) {
      await ipfs.stop()
    }

    await rimraf('./orbitdb')
    await rimraf('./ipfs1')
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

  describe('KeyValue Indexed database type', function () {
    it('replace keyvalue with keyvalue-indexed', async () => {
      useDatabaseType(KeyValueIndexed)
      const name = 'hello keyvalue-indexed database'
      const db = await orbitdb.open(name, { type: 'keyvalue' })

      const indexDirectory = pathJoin('./orbitdb', `./${db.address}/_index/`)

      strictEqual(await existsSync(indexDirectory), true)
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
