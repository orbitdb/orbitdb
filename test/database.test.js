import { strictEqual, deepStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import { existsSync } from 'fs'
import { copy } from 'fs-extra'
import Path from 'path'
import { Database, KeyStore, Identities } from '../src/index.js'
import LevelStorage from '../src/storage/level.js'
import MemoryStorage from '../src/storage/memory.js'
import testKeysPath from './fixtures/test-keys-path.js'
import createHelia from './utils/create-helia.js'

const keysPath = './testkeys'

describe('Database', function () {
  this.timeout(30000)

  let ipfs
  let keystore
  let identities
  let testIdentity
  let db

  const databaseId = 'database-AAA'

  const accessController = {
    canAppend: async (entry) => {
      const identity1 = await identities.getIdentity(entry.identity)
      return identity1.id === testIdentity.id
    }
  }

  before(async () => {
    ipfs = await createHelia()
    await copy(testKeysPath, keysPath)
    keystore = await KeyStore({ path: keysPath })
    identities = await Identities({ keystore })
    testIdentity = await identities.createIdentity({ id: 'userA' })
  })

  after(async () => {
    if (ipfs) {
      await ipfs.stop()
    }

    if (keystore) {
      await keystore.close()
    }

    await rimraf(keysPath)
    await rimraf('./ipfs1')
  })

  afterEach(async () => {
    await rimraf('./orbitdb')
  })

  it('adds an operation', async () => {
    db = await Database({ ipfs, identity: testIdentity, address: databaseId, accessController, directory: './orbitdb' })
    const expected = 'zdpuAwhx6xVpnMPUA7Q4JrvZsyoti5wZ18iDeFwBjPAwsRNof'
    const op = { op: 'PUT', key: 1, value: 'record 1 on db 1' }
    const actual = await db.addOperation(op)

    deepStrictEqual(actual, expected)

    await db.close()
  })

  describe('Options', () => {
    it('uses default directory for headsStorage', async () => {
      db = await Database({ ipfs, identity: testIdentity, address: databaseId, accessController })

      const op1 = { op: 'PUT', key: 1, value: 'record 1 on db 1 version 1' }
      const op2 = { op: 'PUT', key: 1, value: 'record 1 on db 1 version 2' }

      await db.addOperation(op1)
      const hash = await db.addOperation(op2)
      const entry = await db.log.get(hash)

      const headsPath = Path.join('./orbitdb/', `${databaseId}/`, '/log/_heads/')

      strictEqual(await existsSync(headsPath), true)

      await db.close()

      const headsStorage = await LevelStorage({ path: headsPath })
      const e = await headsStorage.get('heads')
      const heads = e ? JSON.parse(e) : []

      strictEqual(heads.length, 1)
      strictEqual(heads.at(0).hash, hash)
      strictEqual(heads.at(0).next.length, 1)
      strictEqual(heads.at(0).next.at(0), entry.next.at(0))

      await headsStorage.close()

      await rimraf(headsPath)
    })

    it('uses given directory for headsStorage', async () => {
      db = await Database({ ipfs, identity: testIdentity, address: databaseId, accessController, directory: './custom-directory' })
      const op1 = { op: 'PUT', key: 1, value: 'record 1 on db 1 version 1' }
      const op2 = { op: 'PUT', key: 1, value: 'record 1 on db 1 version 2' }

      await db.addOperation(op1)
      const hash = await db.addOperation(op2)
      const entry = await db.log.get(hash)

      const headsPath = Path.join('./custom-directory/', `${databaseId}/`, '/log/_heads/')

      strictEqual(await existsSync(headsPath), true)

      await db.close()

      const headsStorage = await LevelStorage({ path: headsPath })

      const e = await headsStorage.get('heads')
      const heads = e ? JSON.parse(e) : []

      strictEqual(heads.length, 1)
      strictEqual(heads.at(0).hash, hash)
      strictEqual(heads.at(0).next.length, 1)
      strictEqual(heads.at(0).next.at(0), entry.next.at(0))

      await headsStorage.close()

      await rimraf(headsPath)
      await rimraf('./custom-directory')
    })

    it('uses given MemoryStorage for headsStorage', async () => {
      const headsStorage = await MemoryStorage()
      db = await Database({ ipfs, identity: testIdentity, address: databaseId, accessController, directory: './orbitdb', headsStorage })
      const op1 = { op: 'PUT', key: 1, value: 'record 1 on db 1 version 1' }
      const op2 = { op: 'PUT', key: 1, value: 'record 1 on db 1 version 2' }

      await db.addOperation(op1)
      const hash = await db.addOperation(op2)
      const entry = await db.log.get(hash)

      const e = await headsStorage.get('heads')
      const heads = e ? JSON.parse(e) : []

      strictEqual(heads.length, 1)
      strictEqual(heads.at(0).hash, hash)
      strictEqual(heads.at(0).next.length, 1)
      strictEqual(heads.at(0).next.at(0), entry.next.at(0))

      await db.close()

      await headsStorage.close()
      await rimraf('./orbitdb')
    })

    it('uses given MemoryStorage for entryStorage', async () => {
      const entryStorage = await MemoryStorage()
      const headsStorage = await MemoryStorage()
      db = await Database({ ipfs, identity: testIdentity, address: databaseId, accessController, directory: './orbitdb', headsStorage, entryStorage })
      const op1 = { op: 'PUT', key: 1, value: 'record 1 on db 1 version 1' }
      const op2 = { op: 'PUT', key: 1, value: 'record 1 on db 1 version 2' }

      await db.addOperation(op1)
      const hash = await db.addOperation(op2)
      const entry = await db.log.get(hash)

      const e = await headsStorage.get('heads')
      const heads = e ? JSON.parse(e) : []

      strictEqual(heads.length, 1)
      strictEqual(heads.at(0).hash, hash)
      strictEqual(heads.at(0).next.length, 1)
      strictEqual(heads.at(0).next.at(0), entry.next.at(0))

      await db.close()

      await entryStorage.close()
      await headsStorage.close()
      await rimraf('./orbitdb')
    })
  })

  describe('Events', () => {
    beforeEach(async () => {
      db = await Database({ ipfs, identity: testIdentity, address: databaseId, accessController, directory: './orbitdb' })
    })

    it('emits \'close\' when the database is closed', async () => {
      let closed = false
      const onClose = () => {
        closed = true
      }

      db.events.on('close', onClose)

      await db.close()

      strictEqual(closed, true)
    })

    it('emits \'drop\' when the database is dropped', async () => {
      let dropped = false
      const onDrop = () => {
        dropped = true
      }

      db.events.on('drop', onDrop)

      await db.drop()

      strictEqual(dropped, true)

      await db.close()
    })
  })
})
