'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const rmrf = require('rimraf')
const mapSeries = require('p-map-series')
const levelup = require('levelup')
const leveldown = require('leveldown')
const OrbitDB = require('../src/OrbitDB')
const OrbitDBAccessController = require('../src/orbit-db-access-controllers/orbitdb-access-controller')

const {
    config,
    startIpfs,
    stopIpfs,
    testAPIs,
} = require('./utils')

const dbPath = './orbitdb/tests/create-open'
const ipfsPath = './orbitdb/tests/create-open/ipfs'

Object.keys(testAPIs).forEach(API => {
  describe('orbit-db - Access Controller (OrbitDB)', function() {
    this.timeout(config.timeout)

    let ipfs, orbitdb, pubKey
    let localDataPath

    before(async () => {
      config.daemon1.repo = ipfsPath
      rmrf.sync(config.daemon1.repo)
      rmrf.sync(dbPath)
      const ipfsd = await startIpfs(API, config.daemon1)
      ipfs = ipfsd.api
      orbitdb = new OrbitDB(ipfs, dbPath)
      pubKey = orbitdb.key.getPublic('hex')
    })

    after(async () => {
      if(orbitdb) 
        await orbitdb.stop()

      if (ipfs)
        await ipfs.stop()
    })

    describe('Constructor', function() {
      let accessController

      before(() => {
        accessController = new OrbitDBAccessController(orbitdb)
      })

      it('creates an access controller', () => {
        assert.notEqual(accessController, null)
      })

      it('has OrbitDB instance', async () => {
        assert.notEqual(accessController._orbitdb, null)
        assert.equal(accessController._orbitdb.id, orbitdb.id)
      })

      it('has IPFS instance', async () => {
        assert.equal(accessController._orbitdb._ipfs._peerInfo.id._idB58String, ipfs._peerInfo.id._idB58String)
      })

      it('sets default capabilities', async () => {
        assert.deepEqual(accessController.capabilities, {})
      })

      it('sets the controller type', () => {
        assert.equal(accessController.controllerType, 'orbitdb')
      })
    })

    describe('add', function() {
      let accessController

      before(async () => {
        accessController = new OrbitDBAccessController(orbitdb)
        await accessController.load('testdb/add')
      })

      it('loads the root access controller from IPFS', () => {
        assert.deepEqual(accessController._db.acl.capabilities, {
          write: [pubKey],
        });
        assert.equal(accessController._db.acl.controllerType, 'ipfs');
      });

      it('adds a capability', async () => {
        try {
          await accessController.add('write', pubKey)
        } catch (e) {
          assert(e, null)
        }
        assert.deepEqual(accessController.capabilities, {
          'write': [pubKey]
        })
      })

      it('adds more capabilities', async () => {
        try {
          await accessController.add('read', 'ABCD')
          await accessController.add('delete', 'ABCD')
        } catch (e) {
          assert.equal(e, null)
        }
        assert.deepEqual(accessController.capabilities, {
          'write': [pubKey],
          'read': ['ABCD'],
          'delete': ['ABCD'],
        })
      })


      it('send \'updated\' event when a capability was added', async () => {
        return new Promise(async (resolve, reject) => {
          accessController.on('updated', () => {
            try {
              assert.deepEqual(accessController.capabilities, {
                'write': [pubKey],
                'read': ['ABCD', 'AXES'],
                'delete': ['ABCD'],
              })
              resolve()
            } catch (e) {
              reject(e)
            }
          })
          await accessController.add('read', 'AXES')
        })
      })
    })

    describe('remove', function() {
      let accessController

      before(async () => {
        accessController = new OrbitDBAccessController(orbitdb)
        await accessController.load('testdb/remove')
      })

      it('removes a capability', async () => {
        try {
          await accessController.add('write', pubKey)
          await accessController.add('write', 'AABB')
          // assert.deepEqual(accessController.capabilities, { write: ['AABB', pubKey] })
          await accessController.remove('write', 'AABB')
          assert.deepEqual(accessController.capabilities, { write: [pubKey] })
        } catch (e) {
          assert.equal(e, null)
        }
        assert.deepEqual(accessController.capabilities, { write: [pubKey] })
      })

      it('can\'t remove the creator\'s write access', async () => {
        try {
          await accessController.remove('write', pubKey)
        } catch (e) {
          assert.equal(e, null)
        }
        assert.deepEqual(accessController.capabilities, { write: [pubKey] })
      })

      it('removes more capabilities', async () => {
        try {
          await accessController.add('read', 'ABCD')
          await accessController.add('delete', 'ABCD')
          await accessController.add('write', pubKey)
          await accessController.remove('read', 'ABCD')
          await accessController.remove('delete', 'ABCD')
        } catch (e) {
          assert.equal(e, null)
        }
        assert.deepEqual(accessController.capabilities, {
          'write': [pubKey]
        })
      })

      it('send \'updated\' event when a capability was removed', async () => {
        await accessController.add('admin', 'cats')
        await accessController.add('admin', 'dogs')

        return new Promise(async (resolve, reject) => {
          accessController.on('updated', () => {
            try {
              assert.deepEqual(accessController.capabilities, {
                'write': [pubKey],
                'admin': ['dogs'],
              })
              resolve()
            } catch (e) {
              reject(e)
            }
          })
          await accessController.remove('admin', 'cats')
        })
      })
    })

    describe('save and load', function() {
      let accessController, address, dbName

      before(async () => {
        dbName = 'testdb-load-' + new Date().getTime()
        accessController = new OrbitDBAccessController(orbitdb)
        await accessController.load(dbName)
        await accessController.add('write', 'A')
        await accessController.add('write', 'B')
        await accessController.add('write', 'C')
        await accessController.add('write', 'C') // double entry
        await accessController.add('another', 'AA')
        await accessController.add('another', 'BB')
        await accessController.remove('another', 'AA')
        await accessController.add('admin', pubKey)
        address = await accessController.save()
        return new Promise(async (resolve) => {
          // Test that the access controller emits 'updated' after it was loaded
          accessController.on('updated', () => resolve())
          await accessController.load(address)
        })
      })

      it('has the correct database address for the internal db', async () => {
        const addr = accessController._db.address.toString().split('/')
        assert.equal(addr[addr.length - 1], '_access')
        assert.equal(addr[addr.length - 2], dbName)
    })

    it('has correct capabalities', async () => {
      assert.equal(accessController.get('admin'), pubKey)
      assert.deepEqual(accessController.get('write').sort(), [pubKey, 'A', 'B', 'C'])
      assert.deepEqual(accessController.get('another'), ['BB'])
    })
  })

  describe('OrbitDB Integration', function() {
    it('saves database manifest file locally', async () => {
      const db = await orbitdb.feed('AABB', { replicate: false, accessController: { type: 'orbitdb' }})
      const dag = await ipfs.object.get(db.address.root)
      const manifest = JSON.parse(dag.toJSON().data)
      assert.notEqual(manifest, )
      assert.equal(manifest.name, 'AABB')
      assert.equal(manifest.type, 'feed')
      assert.notEqual(manifest.accessController, null)
      assert.equal(manifest.accessController.indexOf('/orbitdb'), 0)
      })
    })
  })
})
