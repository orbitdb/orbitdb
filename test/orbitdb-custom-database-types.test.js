import { strictEqual, deepStrictEqual, notStrictEqual } from 'assert'
import rmrf from 'rimraf'
import * as IPFS from 'ipfs-core'
import { OrbitDB, addDatabaseType, databaseTypes, Database } from '../src/index.js'
import config from './config.js'

const type = 'custom!'

const CustomStore = () => async ({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate }) => {
  const database = await Database({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate })

  return {
    ...database,
    type
  }
}

describe('Add a custom database type', function () {
  this.timeout(5000)

  let ipfs
  let orbitdb

  before(async () => {
    ipfs = await IPFS.create({ ...config.daemon1, repo: './ipfs1' })
    orbitdb = await OrbitDB({ ipfs })
  })

  after(async () => {
    if (orbitdb) {
      await orbitdb.stop()
    }

    if (ipfs) {
      await ipfs.stop()
    }

    // Remove the added custom database type from OrbitDB import
    delete databaseTypes[CustomStore.type]

    await rmrf('./orbitdb')
    await rmrf('./ipfs1')
  })

  describe('Default supported database types', function () {
    it('returns default supported database types', async () => {
      const expected = [
        'events',
        'documents',
        'keyvalue'
      ]

      deepStrictEqual(Object.keys(databaseTypes), expected)
    })

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
      addDatabaseType(type, CustomStore)
    })

    it('create a database with the custom database type', async () => {
      const name = 'hello custom database'
      const db = await orbitdb.open(name, { type })
      strictEqual(db.type, type)
      strictEqual(db.name, name)
    })

    it('throws and error if custom database type already exists', async () => {
      let err
      try {
        addDatabaseType(type, CustomStore)
        throw new Error('This should not run.')
      } catch (e) {
        err = e
      }
      notStrictEqual(err, undefined)
      strictEqual(err.message.indexOf('already exists') !== -1, true)
    })

    it('returns custom database type after adding it', async () => {
      const expected = [
        'events',
        'documents',
        'keyvalue',
        type
      ]

      deepStrictEqual(Object.keys(databaseTypes), expected)
    })

    it('can be removed from supported database types', async () => {
      const expected = [
        'events',
        'documents',
        'keyvalue'
      ]

      delete databaseTypes[type]

      deepStrictEqual(Object.keys(databaseTypes), expected)
    })
  })
})
