import { notStrictEqual, strictEqual, deepStrictEqual } from 'assert'
import rimraf from 'rimraf'
import Log from '../../src/log.js'
import IdentityProvider from '../../src/identities/index.js'
import KeyStore from '../../src/key-store.js'

// Test utils
import { config, testAPIs } from 'orbit-db-test-utils'
import { identityKeys, signingKeys, createTestIdentities, cleanUpTestIdentities } from '../fixtures/orbit-db-identity-keys.js'

const { sync: rmrf } = rimraf
const { createIdentity } = IdentityProvider

Object.keys(testAPIs).forEach((IPFS) => {
  describe('Signed Log (' + IPFS + ')', function () {
    this.timeout(config.timeout)

    let keystore, signingKeyStore
    let testIdentity, testIdentity2

    before(async () => {
      const testIdentities = await createTestIdentities()
      testIdentity = testIdentities[0]
      testIdentity2 = testIdentities[1]
    })

    after(async () => {
      await cleanUpTestIdentities([testIdentity, testIdentity2])

      if (keystore) {
        await keystore.close()
      }
      if (signingKeyStore) {
        await signingKeyStore.close()
      }
      rmrf('./keys_1')
      rmrf('./keys_2')
    })

    it('creates a signed log', async () => {
      const logId = 'A'
      const log = await Log(testIdentity, { logId })
      notStrictEqual(log.id, null)
      strictEqual(log.id, logId)
    })

    // it('has the correct identity', () => {
    //   const log = await Log(testIdentity, { logId: 'A' })
    //   notStrictEqual(log.id, null)
    //   strictEqual(log.id, 'A')
    //   strictEqual(log.identity.id, '03e0480538c2a39951d054e17ff31fde487cb1031d0044a037b53ad2e028a3e77c')
    //   strictEqual(log.identity.publicKey, '048bef2231e64d5c7147bd4b8afb84abd4126ee8d8335e4b069ac0a65c7be711cea5c1b8d47bc20ebaecdca588600ddf2894675e78b2ef17cf49e7bbaf98080361')
    //   strictEqual(log.identity.signatures.id, '3045022100f5f6f10571d14347aaf34e526ce3419fd64d75ffa7aa73692cbb6aeb6fbc147102203a3e3fa41fa8fcbb9fc7c148af5b640e2f704b20b3a4e0b93fc3a6d44dffb41e')
    //   strictEqual(log.identity.signatures.publicKey, '3044022020982b8492be0c184dc29de0a3a3bd86a86ba997756b0bf41ddabd24b47c5acf02203745fda39d7df650a5a478e52bbe879f0cb45c074025a93471414a56077640a4')
    // })

    it('has the correct public key', async () => {
      const log = await Log(testIdentity, { logId: 'A' })
      strictEqual(log.identity.publicKey, testIdentity.publicKey)
    })

    it('has the correct pkSignature', async () => {
      const log = await Log(testIdentity, { logId: 'A' })
      strictEqual(log.identity.signatures.id, testIdentity.signatures.id)
    })

    it('has the correct signature', async () => {
      const log = await Log(testIdentity, { logId: 'A' })
      strictEqual(log.identity.signatures.publicKey, testIdentity.signatures.publicKey)
    })

    // it('entries contain an identity', async () => {
    //   const log = await Log(testIdentity, { logId: 'A' })
    //   await log.append('one')
    //   const values = await log.values()
    //   notStrictEqual(values[0].sig, null)
    //   deepStrictEqual(values[0].identity, testIdentity.toJSON())
    // })

    it('doesn\'t sign entries when identity is not defined', async () => {
      let err
      try {
        await Log(null)
      } catch (e) {
        err = e
      }
      strictEqual(err.message, 'Identity is required')
    })

    it('throws an error if log is signed but trying to merge with an entry that doesn\'t have public signing key', async () => {
      const log1 = await Log(testIdentity, { logId: 'A' })
      const log2 = await Log(testIdentity2, { logId: 'A' })

      let err
      try {
        await log1.append('one')
        const entry = await log2.append('two')
        delete entry.key
        await log1.joinEntry(entry)
      } catch (e) {
        err = e.toString()
      }
      strictEqual(err, 'Error: Entry doesn\'t have a key')
    })

    it('throws an error if log is signed but trying to merge an entry that doesn\'t have a signature', async () => {
      const log1 = await Log(testIdentity, { logId: 'A' })
      const log2 = await Log(testIdentity2, { logId: 'A' })

      let err
      try {
        await log1.append('one')
        const entry = await log2.append('two')
        delete entry.sig
        await log1.joinEntry(entry)
      } catch (e) {
        err = e.toString()
      }
      strictEqual(err, 'Error: Entry doesn\'t have a signature')
    })

    it('throws an error if log is signed but the signature doesn\'t verify', async () => {
      const log1 = await Log(testIdentity, { logId: 'A' })
      const log2 = await Log(testIdentity2, { logId: 'A' })
      let err

      try {
        const entry1 = await log1.append('one')
        const entry2 = await log2.append('two')
        entry2.sig = entry1.sig
        await log1.joinEntry(entry2)
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
      const log1 = await Log(testIdentity, { logId: 'A' })
      const log2 = await Log(testIdentity2, { logId: 'A', access: denyAccess })

      let err
      try {
        await log1.append('one')
        await log2.append('two')
        await log1.join(log2)
      } catch (e) {
        err = e.toString()
      }

      strictEqual(err, `Error: Could not append entry:\nKey "${testIdentity2.hash}" is not allowed to write to the log`)
    })

    it('throws an error upon join if entry doesn\'t have append access', async () => {
        const testACL = {
          canAppend: async (entry) => {
            const identity = await testIdentity.provider.get(entry.identity)
            return identity && identity.id !== testIdentity2.id
          }
        }
      const log1 = await Log(testIdentity, { logId: 'A', access: testACL })
      const log2 = await Log(testIdentity2, { logId: 'A' })

      let err
      try {
        await log1.append('one')
        await log2.append('two')
        await log1.join(log2)
      } catch (e) {
        err = e.toString()
      }

      strictEqual(err, `Error: Could not append entry:\nKey "${testIdentity2.hash}" is not allowed to write to the log`)
    })
  })
})