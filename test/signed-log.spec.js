import { notStrictEqual, strictEqual, deepStrictEqual } from 'assert'
import rimraf from 'rimraf'
import { copy } from 'fs-extra'
import { Log } from '../src/log.js'
import IdentityProvider from 'orbit-db-identity-provider'
import Keystore from '../src/Keystore.js'

// Test utils
import { config, testAPIs } from 'orbit-db-test-utils'

const { sync: rmrf } = rimraf
const { createIdentity } = IdentityProvider

let testIdentity, testIdentity2

Object.keys(testAPIs).forEach((IPFS) => {
  describe('Signed Log (' + IPFS + ')', function () {
    this.timeout(config.timeout)

    const { identityKeyFixtures, signingKeyFixtures, identityKeysPath, signingKeysPath } = config

    let keystore, signingKeystore

    before(async () => {
      rmrf(identityKeysPath)
      rmrf(signingKeysPath)
      await copy(identityKeyFixtures, identityKeysPath)
      await copy(signingKeyFixtures, signingKeysPath)

      keystore = new Keystore(identityKeysPath)
      signingKeystore = new Keystore(signingKeysPath)

      testIdentity = await createIdentity({ id: 'userA', keystore, signingKeystore })
      testIdentity2 = await createIdentity({ id: 'userB', keystore, signingKeystore })
    })

    after(async () => {
      rmrf(identityKeysPath)
      rmrf(signingKeysPath)
      await keystore.close()
      await signingKeystore.close()
    })

    it('creates a signed log', () => {
      const logId = 'A'
      const log = Log(testIdentity, { logId })
      notStrictEqual(log.id, null)
      strictEqual(log.id, logId)
    })

    // it('has the correct identity', () => {
    //   const log = Log(testIdentity, { logId: 'A' })
    //   notStrictEqual(log.id, null)
    //   strictEqual(log.id, 'A')
    //   strictEqual(log.identity.id, '03e0480538c2a39951d054e17ff31fde487cb1031d0044a037b53ad2e028a3e77c')
    //   strictEqual(log.identity.publicKey, '048bef2231e64d5c7147bd4b8afb84abd4126ee8d8335e4b069ac0a65c7be711cea5c1b8d47bc20ebaecdca588600ddf2894675e78b2ef17cf49e7bbaf98080361')
    //   strictEqual(log.identity.signatures.id, '3045022100f5f6f10571d14347aaf34e526ce3419fd64d75ffa7aa73692cbb6aeb6fbc147102203a3e3fa41fa8fcbb9fc7c148af5b640e2f704b20b3a4e0b93fc3a6d44dffb41e')
    //   strictEqual(log.identity.signatures.publicKey, '3044022020982b8492be0c184dc29de0a3a3bd86a86ba997756b0bf41ddabd24b47c5acf02203745fda39d7df650a5a478e52bbe879f0cb45c074025a93471414a56077640a4')
    // })

    it('has the correct public key', () => {
      const log = Log(testIdentity, { logId: 'A' })
      strictEqual(log.identity.publicKey, testIdentity.publicKey)
    })

    it('has the correct pkSignature', () => {
      const log = Log(testIdentity, { logId: 'A' })
      strictEqual(log.identity.signatures.id, testIdentity.signatures.id)
    })

    it('has the correct signature', () => {
      const log = Log(testIdentity, { logId: 'A' })
      strictEqual(log.identity.signatures.publicKey, testIdentity.signatures.publicKey)
    })

    it('entries contain an identity', async () => {
      const log = Log(testIdentity, { logId: 'A' })
      await log.append('one')
      const values = await log.values()
      notStrictEqual(values[0].sig, null)
      deepStrictEqual(values[0].identity, testIdentity.toJSON())
    })

    it('doesn\'t sign entries when identity is not defined', async () => {
      let err
      try {
        Log(null)
      } catch (e) {
        err = e
      }
      strictEqual(err.message, 'Identity is required')
    })

    it('doesn\'t join logs with different IDs ', async () => {
      const log1 = Log(testIdentity, { logId: 'A' })
      const log2 = Log(testIdentity2, { logId: 'A' })

      let err
      try {
        await log1.append('one')
        await log2.append('two')
        await log2.append('three')
        await log1.join(log2)
      } catch (e) {
        err = e.toString()
        throw e
      }

      const values = await log1.values()

      strictEqual(err, undefined)
      strictEqual(log1.id, 'A')
      strictEqual(values.length, 3)
      strictEqual(values[0].payload, 'two')
      strictEqual(values[1].payload, 'one')
      strictEqual(values[2].payload, 'three')
    })

    it('throws an error if log is signed but trying to merge with an entry that doesn\'t have public signing key', async () => {
      const log1 = Log(testIdentity, { logId: 'A' })
      const log2 = Log(testIdentity2, { logId: 'A' })

      let err
      try {
        await log1.append('one')
        await log2.append('two')
        delete log2.heads()[0].key
        await log1.join(log2)
      } catch (e) {
        err = e.toString()
      }
      strictEqual(err, 'Error: Entry doesn\'t have a key')
    })

    it('throws an error if log is signed but trying to merge an entry that doesn\'t have a signature', async () => {
      const log1 = Log(testIdentity, { logId: 'A' })
      const log2 = Log(testIdentity2, { logId: 'A' })

      let err
      try {
        await log1.append('one')
        await log2.append('two')
        delete log2.heads()[0].sig
        await log1.join(log2)
      } catch (e) {
        err = e.toString()
      }
      strictEqual(err, 'Error: Entry doesn\'t have a signature')
    })

    it('throws an error if log is signed but the signature doesn\'t verify', async () => {
      const log1 = Log(testIdentity, { logId: 'A' })
      const log2 = Log(testIdentity2, { logId: 'A' })
      let err

      try {
        await log1.append('one')
        await log2.append('two')
        log2.heads()[0].sig = log1.heads()[0].sig
        await log1.join(log2)
      } catch (e) {
        err = e.toString()
      }

      const entry = (await log2.values())[0]
      const values = await log1.values()
      strictEqual(err, `Error: Could not validate signature for entry "${entry.hash}"`)
      strictEqual(values.length, 1)
      strictEqual(values[0].payload, 'one')
    })

    it('throws an error if entry doesn\'t have append access', async () => {
      const denyAccess = { canAppend: () => false }
      const log1 = Log(testIdentity, { logId: 'A' })
      const log2 = Log(testIdentity2, { logId: 'A', access: denyAccess })

      let err
      try {
        await log1.append('one')
        await log2.append('two')
        await log1.join(log2)
      } catch (e) {
        err = e.toString()
      }

      strictEqual(err, `Error: Could not append entry:\nKey "${testIdentity2.id}" is not allowed to write to the log`)
    })

    it('throws an error upon join if entry doesn\'t have append access', async () => {
      const testACL = {
        canAppend: (entry) => entry.identity.id !== testIdentity2.id
      }
      const log1 = Log(testIdentity, { logId: 'A', access: testACL })
      const log2 = Log(testIdentity2, { logId: 'A' })

      let err
      try {
        await log1.append('one')
        await log2.append('two')
        await log1.join(log2)
      } catch (e) {
        err = e.toString()
      }

      strictEqual(err, `Error: Could not append entry:\nKey "${testIdentity2.id}" is not allowed to write to the log`)
    })
  })
})
