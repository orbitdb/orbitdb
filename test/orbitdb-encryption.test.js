import { strictEqual, notEqual } from 'assert'
import { rimraf } from 'rimraf'
import path from 'path'
import { createOrbitDB } from '../src/index.js'
import connectPeers from './utils/connect-nodes.js'
import waitFor from './utils/wait-for.js'
import createHelia from './utils/create-helia.js'

import * as Block from 'multiformats/block'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'

import SimpleEncryption from '@orbitdb/simple-encryption'

const codec = dagCbor
const hasher = sha256

const dbPath = './orbitdb/tests/write-permissions'

describe('Encryption', function () {
  this.timeout(5000)

  let ipfs1, ipfs2
  let orbitdb1, orbitdb2
  let db1, db2

  let replicationEncryption
  let dataEncryption

  before(async () => {
    [ipfs1, ipfs2] = await Promise.all([createHelia(), createHelia()])
    await connectPeers(ipfs1, ipfs2)

    await rimraf('./orbitdb')

    orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'user1', directory: path.join(dbPath, '1') })
    orbitdb2 = await createOrbitDB({ ipfs: ipfs2, id: 'user2', directory: path.join(dbPath, '2') })

    replicationEncryption = await SimpleEncryption({ password: 'hello' })
    dataEncryption = await SimpleEncryption({ password: 'world' })
  })

  after(async () => {
    if (orbitdb1) {
      await orbitdb1.stop()
    }

    if (orbitdb2) {
      await orbitdb2.stop()
    }

    if (ipfs1) {
      await ipfs1.stop()
    }

    if (ipfs2) {
      await ipfs2.stop()
    }

    await rimraf('./orbitdb')
    await rimraf('./ipfs1')
    await rimraf('./ipfs2')
  })

  describe('Data is encrypted when replicated to peers', async () => {
    afterEach(async () => {
      if (db1) {
        await db1.drop()
        await db1.close()
      }
      if (db2) {
        await db2.drop()
        await db2.close()
      }
    })

    it('encrypts/decrypts data', async () => {
      let connected = false
      let updated = false
      let error = false

      const encryption = {
        data: dataEncryption
      }

      db1 = await orbitdb1.open('encryption-test-1', { encryption })
      db2 = await orbitdb2.open(db1.address, { encryption })

      const onJoin = async (peerId, heads) => {
        connected = true
      }
      db2.events.on('join', onJoin)

      await waitFor(() => connected, () => true)

      const onUpdate = async (peerId, heads) => {
        updated = true
      }
      db2.events.on('update', onUpdate)

      const onError = async (err) => {
        // Catch "Could not decrypt entry" errors
        console.log(err)
        error = true
      }
      db2.events.on('error', onError)

      const hash1 = await db1.add('record 1')
      const hash2 = await db1.add('record 2')

      strictEqual(await db1.get(hash1), 'record 1')
      strictEqual(await db1.get(hash2), 'record 2')

      await waitFor(() => updated || error, () => true)

      const all = await db2.all()

      strictEqual(all.length, 2)
      strictEqual(all[0].value, 'record 1')
      strictEqual(all[1].value, 'record 2')
    })

    it('encrypts/decrypts log', async () => {
      let connected = false
      let updated = false
      let error = false

      const encryption = {
        replication: replicationEncryption
      }

      db1 = await orbitdb1.open('encryption-test-1', { encryption })
      db2 = await orbitdb2.open(db1.address, { encryption })

      const onJoin = async (peerId, heads) => {
        connected = true
      }
      db2.events.on('join', onJoin)

      await waitFor(() => connected, () => true)

      const onUpdate = async (peerId, heads) => {
        updated = true
      }
      db2.events.on('update', onUpdate)

      const onError = async (err) => {
        // Catch "Could not decrypt entry" errors
        console.log(err)
        error = true
      }
      db2.events.on('error', onError)

      const hash1 = await db1.add('record 1')
      const hash2 = await db1.add('record 2')

      strictEqual(await db1.get(hash1), 'record 1')
      strictEqual(await db1.get(hash2), 'record 2')

      await waitFor(() => updated || error, () => true)

      const all = await db2.all()

      strictEqual(all.length, 2)
      strictEqual(all[0].value, 'record 1')
      strictEqual(all[1].value, 'record 2')
    })

    it('encrypts/decrypts log and data', async () => {
      let connected = false
      let updated = false
      let error = false

      const encryption = {
        replication: replicationEncryption,
        data: dataEncryption
      }

      db1 = await orbitdb1.open('encryption-test-1', { encryption })
      db2 = await orbitdb2.open(db1.address, { encryption })

      const onJoin = async (peerId, heads) => {
        connected = true
      }
      db2.events.on('join', onJoin)

      await waitFor(() => connected, () => true)

      const onUpdate = async (peerId, heads) => {
        updated = true
      }
      db2.events.on('update', onUpdate)

      const onError = async (err) => {
        // Catch "Could not decrypt entry" errors
        console.log(err)
        error = true
      }
      db2.events.on('error', onError)

      const hash1 = await db1.add('record 1')
      const hash2 = await db1.add('record 2')

      strictEqual(await db1.get(hash1), 'record 1')
      strictEqual(await db1.get(hash2), 'record 2')

      await waitFor(() => updated || error, () => true)

      const all = await db2.all()

      strictEqual(all.length, 2)
      strictEqual(all[0].value, 'record 1')
      strictEqual(all[1].value, 'record 2')
    })

    it('throws an error if log can\'t be decrypted', async () => {
      let connected = false
      let hasError = false
      let error

      const replicationEncryptionWithFailure = await SimpleEncryption({ password: 'goodbye' })

      const encryption = {
        replication: replicationEncryption
      }

      const encryptionWithFailure = {
        replication: replicationEncryptionWithFailure
      }

      db1 = await orbitdb1.open('encryption-test-1', { encryption })
      db2 = await orbitdb2.open(db1.address, { encryption: encryptionWithFailure })

      const onJoin = async (peerId, heads) => {
        connected = true
      }
      db2.events.on('join', onJoin)

      await waitFor(() => connected, () => true)

      const onError = async (err) => {
        // Catch "Could not decrypt entry" errors
        error = err
        hasError = true
      }
      db2.events.on('error', onError)

      await db1.add('record 1')

      await waitFor(() => hasError, () => true)

      strictEqual(error.message, 'Could not decrypt entry')

      const all = await db2.all()

      strictEqual(all.length, 0)
    })

    it('throws an error if data can\'t be decrypted', async () => {
      let connected = false
      let hasError = false
      let error

      const dataEncryptionWithFailure = await SimpleEncryption({ password: 'goodbye' })

      const encryption = {
        data: dataEncryption
      }

      const encryptionWithFailure = {
        data: dataEncryptionWithFailure
      }

      db1 = await orbitdb1.open('encryption-test-1', { encryption })
      db2 = await orbitdb2.open(db1.address, { encryption: encryptionWithFailure })

      const onJoin = async (peerId, heads) => {
        connected = true
      }
      db2.events.on('join', onJoin)

      await waitFor(() => connected, () => true)

      const onError = async (err) => {
        // Catch "Could not decrypt entry" errors
        error = err
        hasError = true
      }
      db2.events.on('error', onError)

      await db1.add('record 1')

      await waitFor(() => hasError, () => true)

      strictEqual(error.message, 'Could not decrypt payload')

      const all = await db2.all()

      strictEqual(all.length, 0)
    })
  })

  describe('Data is encrypted in storage', async () => {
    afterEach(async () => {
      if (db1) {
        await db1.drop()
        await db1.close()
      }
    })

    it('payload bytes are encrypted in storage', async () => {
      let error

      const encryption = {
        data: dataEncryption
      }

      db1 = await orbitdb1.open('encryption-test-1', { encryption })

      const onError = async (err) => {
        // Catch "Could not decrypt entry" errors
        console.log(err)
        error = true
      }
      db1.events.on('error', onError)

      const hash1 = await db1.add('record 1')

      const bytes = await db1.log.storage.get(hash1)
      const { value } = await Block.decode({ bytes, codec, hasher })
      const payload = value.payload

      strictEqual(payload.constructor, Uint8Array)

      try {
        await Block.decode({ bytes: payload, codec, hasher })
      } catch (e) {
        error = e
      }

      strictEqual(error.message.startsWith('CBOR decode error'), true)
    })

    it('entry bytes are encrypted in storage', async () => {
      let error

      const encryption = {
        replication: replicationEncryption
      }

      db1 = await orbitdb1.open('encryption-test-1', { encryption })

      const onError = async (err) => {
        // Catch "Could not decrypt entry" errors
        console.log(err)
        error = true
      }
      db1.events.on('error', onError)

      const hash1 = await db1.add('record 1')
      let decodedBytes

      try {
        const bytes = await db1.log.storage.get(hash1)
        decodedBytes = await Block.decode({ bytes, codec, hasher })
        await Block.decode({ bytes: decodedBytes, codec, hasher })
      } catch (e) {
        error = e
      }

      notEqual(error, undefined)
      strictEqual(error.message.startsWith('CBOR decode error'), true)
      strictEqual(decodedBytes.value.constructor, Uint8Array)
    })
  })
})
