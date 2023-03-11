import { strictEqual, deepStrictEqual } from 'assert'
import rmrf from 'rimraf'
import { copy } from 'fs-extra'
import * as IPFS from 'ipfs'
import { Log, Entry, Database, KeyStore, Identities } from '../src/index.js'
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

  beforeEach(async () => {
    db = await Database({ OpLog, ipfs, identity: testIdentity, address: databaseId, accessController, directory: './orbitdb1' })
  })

  afterEach(async () => {
    await rmrf('./orbitdb1')
  })

  it('adds an operation', async () => {
    const expected = 'zdpuAqQ9TJpMhPShuT315m2D9LUBkBPy8YX9zatjEynd2suZv'
    const op = { op: 'PUT', key: 1, value: 'record 1 on db 1' }
    const actual = await db.addOperation(op)

    deepStrictEqual(actual, expected)

    await db.close()
  })

  describe('Events', () => {
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
