import { strictEqual, deepStrictEqual, notStrictEqual } from 'assert'
import rmrf from 'rimraf'
import * as IPFS from 'ipfs-core'
import OrbitDB, { AccessControllers } from '../src/orbitdb.js'
import config from './config.js'
import pathJoin from '../src/utils/path-join.js'

const type = 'custom!'

const CustomAccessController = () => async ({ orbitdb, identities, address }) => {
  address = pathJoin('/', type, 'controller')

  return {
    address
  }
}

CustomAccessController.type = type

describe('Add a custom access controller', function () {
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
    AccessControllers.remove(type)

    await rmrf('./orbitdb')
    await rmrf('./ipfs1')
  })

  describe('Default supported access controllers', function () {
    it('returns default supported access controllers', async () => {
      const expected = [
        'ipfs',
        'orbitdb'
      ]

      deepStrictEqual(Object.keys(AccessControllers.types), expected)
    })

    it('throws and error if custom access controller hasn\'t been added', async () => {
      let err
      try {
        const db = await orbitdb.open('hello', { AccessController: CustomAccessController() })

        await db.close()
        await orbitdb.open(db.address)
      } catch (e) {
        err = e
      }
      notStrictEqual(err, undefined)
      strictEqual(err.message, 'AccessController type \'custom!\' is not supported')
    })
  })

  describe('Custom access controller', function () {
    before(() => {
      AccessControllers.add(CustomAccessController)
    })

    it('create a database with the custom access controller', async () => {
      const name = 'hello custom AC'
      const db = await orbitdb.open(name, { AccessController: CustomAccessController() })
      strictEqual(db.access.address, '/custom!/controller')
    })

    it('throws and error if custom access controller already exists', async () => {
      let err
      try {
        AccessControllers.add(CustomAccessController)
      } catch (e) {
        err = e.toString()
      }

      strictEqual(err, 'Error: Access controller \'custom!\' already added.')
    })

    it('returns custom access controller after adding it', async () => {
      const expected = [
        'ipfs',
        'orbitdb',
        type
      ]

      deepStrictEqual(Object.keys(AccessControllers.types), expected)
    })

    it('can be removed from supported access controllers', async () => {
      const expected = [
        'ipfs',
        'orbitdb'
      ]

      AccessControllers.remove(type)

      deepStrictEqual(Object.keys(AccessControllers.types), expected)
    })
  })
})
