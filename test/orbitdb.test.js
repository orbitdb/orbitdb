import { strictEqual, notStrictEqual } from 'assert'
import rimraf from 'rimraf'
import fs from 'fs'
import path from 'path'
import { OrbitDB, isIdentity } from '../src/index.js'

// Test utils
import { config, testAPIs, startIpfs, stopIpfs } from 'orbit-db-test-utils'
import connectPeers from './utils/connect-nodes.js'

const { sync: rmrf } = rimraf

Object.keys(testAPIs).forEach((IPFS) => {
  describe('OrbitDB (' + IPFS + ')', function () {
    this.timeout(config.timeout)

    let ipfsd1, ipfsd2
    let ipfs1, ipfs2
    let orbitdb1

    before(async () => {
      // Start two IPFS instances
      ipfsd1 = await startIpfs(IPFS, config.daemon1)
      ipfsd2 = await startIpfs(IPFS, config.daemon2)
      ipfs1 = ipfsd1.api
      ipfs2 = ipfsd2.api

      await connectPeers(ipfs1, ipfs2)
    })

    after(async () => {
      if (ipfsd1) {
        await stopIpfs(ipfsd1)
      }
      if (ipfsd2) {
        await stopIpfs(ipfsd2)
      }
    })

    describe('OrbitDB instance creation - defaults', () => {
      before(async () => {
        rmrf('./orbitdb')
        orbitdb1 = await OrbitDB({ ipfs: ipfs1 })
      })

      after(async () => {
        if (orbitdb1) {
          await orbitdb1.stop()
        }
        rmrf('./orbitdb')
      })

      it('has an IPFS instance', async () => {
        notStrictEqual(orbitdb1.ipfs, undefined)
        strictEqual(typeof orbitdb1.ipfs, 'object')
      })

      it('has the IPFS instance given as a parameter', async () => {
        const { id: expectedId } = await ipfs1.id()
        const { id: resultId } = await orbitdb1.ipfs.id()
        strictEqual(expectedId, resultId)
      })

      it('has a directory', async () => {
        notStrictEqual(orbitdb1.directory, undefined)
        strictEqual(typeof orbitdb1.directory, 'string')
      })

      it('has the directory given as a parameter', async () => {
        strictEqual(orbitdb1.directory, './orbitdb')
      })

      it('has a keystore', async () => {
        notStrictEqual(orbitdb1.keystore, undefined)
        strictEqual(typeof orbitdb1.keystore, 'object')
      })

      it('has a keystore that contains a private key for the created identity', async () => {
        const privateKey = await orbitdb1.keystore.getKey(orbitdb1.identity.id)
        notStrictEqual(privateKey, undefined)
        strictEqual(privateKey.constructor.name, 'Secp256k1PrivateKey')
        notStrictEqual(privateKey._key, undefined)
        notStrictEqual(privateKey._publicKey, undefined)
      })

      it('has a keystore that contains a public key that matches the identity\'s public key', async () => {
        const privateKey = await orbitdb1.keystore.getKey(orbitdb1.identity.id)
        const publicKey = await orbitdb1.keystore.getPublic(privateKey)
        notStrictEqual(publicKey, undefined)
        strictEqual(typeof publicKey, 'string')
        strictEqual(publicKey, orbitdb1.identity.publicKey)
      })

      it('creates a directory for the keystore', async () => {
        const directoryExists = fs.existsSync(path.join('./orbitdb/keystore'))
        strictEqual(directoryExists, true)
      })

      it('has an identity', async () => {
        notStrictEqual(orbitdb1.identity, undefined)
        strictEqual(typeof orbitdb1.identity, 'object')
      })

      it('creates a valid identity', async () => {
        strictEqual(isIdentity(orbitdb1.identity), true)
      })

      it('has a peerId', async () => {
        notStrictEqual(orbitdb1.peerId, undefined)
      })

      it('has a peerId of type Ed25519PeerIdImpl', async () => {
        strictEqual(orbitdb1.peerId.constructor.name, 'Ed25519PeerIdImpl')
      })

      it('has a peerId that matches the IPFS id', async () => {
        const { id } = await ipfs1.id()
        strictEqual(orbitdb1.peerId, id)
      })

      it('has an open function', async () => {
        notStrictEqual(orbitdb1.open, undefined)
        strictEqual(typeof orbitdb1.open, 'function')
      })

      it('has a stop function', async () => {
        notStrictEqual(orbitdb1.stop, undefined)
        strictEqual(typeof orbitdb1.stop, 'function')
      })
    })

    describe('OrbitDB instance creation - user given parameters', () => {
      before(async () => {
        rmrf('./orbitdb1')
        orbitdb1 = await OrbitDB({ ipfs: ipfs1, id: 'user1', directory: './orbitdb1' })
      })

      after(async () => {
        if (orbitdb1) {
          await orbitdb1.stop()
        }
        rmrf('./orbitdb1')
      })

      it('has an IPFS instance', async () => {
        notStrictEqual(orbitdb1.ipfs, undefined)
        strictEqual(typeof orbitdb1.ipfs, 'object')
      })

      it('has the IPFS instance given as a parameter', async () => {
        const { id: expectedId } = await ipfs1.id()
        const { id: resultId } = await orbitdb1.ipfs.id()
        strictEqual(expectedId, resultId)
      })

      it('has a directory', async () => {
        notStrictEqual(orbitdb1.directory, undefined)
        strictEqual(typeof orbitdb1.directory, 'string')
      })

      it('has the directory given as a parameter', async () => {
        strictEqual(orbitdb1.directory, './orbitdb1')
      })

      it('has a keystore', async () => {
        notStrictEqual(orbitdb1.keystore, undefined)
        strictEqual(typeof orbitdb1.keystore, 'object')
      })

      it('has a keystore that contains a private key for the created identity', async () => {
        const privateKey = await orbitdb1.keystore.getKey(orbitdb1.identity.id)
        notStrictEqual(privateKey, undefined)
        strictEqual(privateKey.constructor.name, 'Secp256k1PrivateKey')
        notStrictEqual(privateKey._key, undefined)
        notStrictEqual(privateKey._publicKey, undefined)
      })

      it('has a keystore that contains a public key that matches the identity\'s public key', async () => {
        const privateKey = await orbitdb1.keystore.getKey(orbitdb1.identity.id)
        const publicKey = await orbitdb1.keystore.getPublic(privateKey)
        notStrictEqual(publicKey, undefined)
        strictEqual(typeof publicKey, 'string')
        strictEqual(publicKey, orbitdb1.identity.publicKey)
      })

      it('creates a directory for the keystore', async () => {
        const directoryExists = fs.existsSync(path.join('./orbitdb1/keystore'))
        strictEqual(directoryExists, true)
      })

      it('has an identity', async () => {
        notStrictEqual(orbitdb1.identity, undefined)
        strictEqual(typeof orbitdb1.identity, 'object')
      })

      it('creates a valid identity', async () => {
        strictEqual(isIdentity(orbitdb1.identity), true)
      })

      it('has a peerId', async () => {
        notStrictEqual(orbitdb1.peerId, undefined)
      })

      it('has a peerId of type Ed25519PeerIdImpl', async () => {
        strictEqual(orbitdb1.peerId.constructor.name, 'Ed25519PeerIdImpl')
      })

      it('has a peerId that matches the IPFS id', async () => {
        const { id } = await ipfs1.id()
        strictEqual(orbitdb1.peerId, id)
      })

      it('has an open function', async () => {
        notStrictEqual(orbitdb1.open, undefined)
        strictEqual(typeof orbitdb1.open, 'function')
      })

      it('has a stop function', async () => {
        notStrictEqual(orbitdb1.stop, undefined)
        strictEqual(typeof orbitdb1.stop, 'function')
      })
    })

    describe('OrbitDB instance creation - errors', () => {
      after(async () => {
        if (orbitdb1) {
          await orbitdb1.stop()
        }
      })

      it('throws an error if given an empty parameters object', async () => {
        let err
        try {
          orbitdb1 = await OrbitDB({})
        } catch (e) {
          err = e
        }
        notStrictEqual(err, undefined)
        strictEqual(err.message, 'IPFS instance is a required argument. See https://github.com/orbitdb/orbit-db/blob/master/API.md#createinstance')
      })

      it('throws an error if IPFS instance is not given', async () => {
        let err
        try {
          orbitdb1 = await OrbitDB()
        } catch (e) {
          err = e
        }
        notStrictEqual(err, undefined)
        strictEqual(err.message, 'IPFS instance is a required argument. See https://github.com/orbitdb/orbit-db/blob/master/API.md#createinstance')
      })

      it('doesn\'t create the data directory when an error occurs', async () => {
        try {
          orbitdb1 = await OrbitDB()
        } catch (e) {
        }
        const dataDirectoryExists = fs.existsSync(path.join('./orbitdb'))
        const keysDirectoryExists = fs.existsSync(path.join('./orbitdb/keystore'))
        strictEqual(dataDirectoryExists, false)
        strictEqual(keysDirectoryExists, false)
      })
    })
  })
})
