import { strictEqual, deepStrictEqual, notStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import OrbitDB from '../src/orbitdb.js'
import { IPFSAccessController, OrbitDBAccessController, useAccessController, getAccessController } from '../src/access-controllers/index.js'
import pathJoin from '../src/utils/path-join.js'
import createHelia from './utils/create-helia.js'

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
    ipfs = await createHelia()
    orbitdb = await OrbitDB({ ipfs })
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

  describe('Default supported access controllers', function () {
    it('returns default supported access controllers', async () => {
      deepStrictEqual(getAccessController('ipfs'), IPFSAccessController)
      deepStrictEqual(getAccessController('orbitdb'), OrbitDBAccessController)
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
      useAccessController(CustomAccessController)
    })

    it('create a database with the custom access controller', async () => {
      const name = 'hello custom AC'
      const db = await orbitdb.open(name, { AccessController: CustomAccessController() })
      strictEqual(db.access.address, '/custom!/controller')
    })

    it('throws and error if custom access controller has no type', async () => {
      const NoTypeCustomAccessController = () => async () => {
      }

      let err
      try {
        useAccessController(NoTypeCustomAccessController)
      } catch (e) {
        err = e.toString()
      }

      strictEqual(err, 'Error: AccessController does not contain required field \'type\'.')
    })

    it('returns custom access controller after adding it', async () => {
      deepStrictEqual(getAccessController(type), CustomAccessController)
    })
  })
})
