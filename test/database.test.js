import { strictEqual, deepStrictEqual } from 'assert'
import rmrf from 'rimraf'
import { existsSync } from 'fs'
import { copy } from 'fs-extra'
import * as IPFS from 'ipfs'
import Path from 'path'
import { Log, Entry, Database, KeyStore, Identities } from '../src/index.js'
import LevelStorage from '../src/storage/level.js'
import MemoryStorage from '../src/storage/memory.js'
import config from './config.js'
import testKeysPath from './fixtures/test-keys-path.js'

const OpLog = { Log, Entry }
const keysPath = './testkeys'

describe('Database', function () {
  this.timeout(30000)

  let ipfs
  let keystore
  let identities
  let testIdentity
  let db

  const databaseId = 'documentstore-AAA'

  const accessController = {
    canAppend: async (entry) => {
      const identity1 = await identities.getIdentity(entry.identity)
      return identity1.id === testIdentity.id
    }
  }

  before(async () => {
    ipfs = await IPFS.create({ ...config.daemon1, repo: './ipfs1' })

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

    await rmrf(keysPath)
    await rmrf('./ipfs1')
  })

  afterEach(async () => {
    await rmrf('./orbitdb')
  })

  it('adds an operation', async () => {
    db = await Database({ OpLog, ipfs, identity: testIdentity, address: databaseId, accessController, directory: './orbitdb' })
    const expected = 'zdpuAqQ9TJpMhPShuT315m2D9LUBkBPy8YX9zatjEynd2suZv'
    const op = { op: 'PUT', key: 1, value: 'record 1 on db 1' }
    const actual = await db.addOperation(op)

    deepStrictEqual(actual, expected)

    await db.close()
  })

  describe('Options', () => {
    it('uses default directory for headsStorage', async () => {
      db = await Database({ OpLog, ipfs, identity: testIdentity, address: databaseId, accessController })
      const op = { op: 'PUT', key: 1, value: 'record 1 on db 1' }
      const hash = await db.addOperation(op)

      const headsPath = Path.join('./orbitdb/', `${databaseId}/`, '/log/_heads/')

      strictEqual(await existsSync(headsPath), true)

      await db.close()

      const headsStorage = await LevelStorage({ path: headsPath })

      deepStrictEqual((await Entry.decode(await headsStorage.get(hash))).payload, op)

      await headsStorage.close()

      await rmrf(headsPath)
    })

    it('uses given directory for headsStorage', async () => {
      db = await Database({ OpLog, ipfs, identity: testIdentity, address: databaseId, accessController, directory: './custom-directory' })
      const op = { op: 'PUT', key: 1, value: 'record 1 on db 1' }
      const hash = await db.addOperation(op)

      const headsPath = Path.join('./custom-directory/', `${databaseId}/`, '/log/_heads/')

      strictEqual(await existsSync(headsPath), true)

      await db.close()

      const headsStorage = await LevelStorage({ path: headsPath })

      deepStrictEqual((await Entry.decode(await headsStorage.get(hash))).payload, op)

      await headsStorage.close()

      await rmrf(headsPath)
    })

    it('uses given MemoryStorage for headsStorage', async () => {
      const headsStorage = await MemoryStorage()
      db = await Database({ OpLog, ipfs, identity: testIdentity, address: databaseId, accessController, directory: './orbitdb', headsStorage })
      const op = { op: 'PUT', key: 1, value: 'record 1 on db 1' }
      const hash = await db.addOperation(op)

      deepStrictEqual((await Entry.decode(await headsStorage.get(hash))).payload, op)

      await db.close()
    })

    it('uses given MemoryStorage for entryStorage', async () => {
      const entryStorage = await MemoryStorage()
      db = await Database({ OpLog, ipfs, identity: testIdentity, address: databaseId, accessController, directory: './orbitdb', entryStorage })
      const op = { op: 'PUT', key: 1, value: 'record 1 on db 1' }
      const hash = await db.addOperation(op)

      deepStrictEqual((await Entry.decode(await entryStorage.get(hash))).payload, op)

      await db.close()
    })
  })

  describe('Events', () => {
    beforeEach(async () => {
      db = await Database({ OpLog, ipfs, identity: testIdentity, address: databaseId, accessController, directory: './orbitdb' })
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
