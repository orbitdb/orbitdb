'use strict'

const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const assert = require('assert')
const async = require('asyncawait/async')
const await = require('asyncawait/await')
const OrbitDB = require('../src/OrbitDB')
const rmrf = require('rimraf')
const IpfsNodeDaemon = require('ipfs-daemon/src/ipfs-node-daemon')
const IpfsNativeDaemon = require('ipfs-daemon/src/ipfs-native-daemon')

if (typeof window !== 'undefined') 
  window.LOG = 'ERROR'

// Data directories
const defaultIpfsDirectory = './ipfs'
const defaultOrbitDBDirectory = './orbit-db'

// Daemon settings
const daemonsConf = require('./ipfs-daemons.conf.js')

const databaseName = 'oribt-db-tests'

const hasIpfsApiWithPubsub = (ipfs) => {
  return ipfs.object.get !== undefined
      && ipfs.object.put !== undefined
      && ipfs.pubsub.publish !== undefined
      && ipfs.pubsub.subscribe !== undefined
}

const waitForPeers = (ipfs, channel) => {
  return new Promise((resolve) => {
    console.log("Waiting for peers...")
    const interval = setInterval(() => {
      ipfs.pubsub.peers(channel)
        .then((peers) => {
          if (peers.length > 0) {
            clearInterval(interval)
            resolve()
          }
        })
    }, 1000)
  })
}

// [IpfsNativeDaemon, IpfsNodeDaemon].forEach((IpfsDaemon) => {
[IpfsNativeDaemon].forEach((IpfsDaemon) => {

  describe('orbit-db replication', function() {
    this.timeout(40000)

    let ipfs1, ipfs2, client1, client2, db1, db2

    const removeDirectories= () => {
      rmrf.sync(daemonsConf.daemon1.IpfsDataDir)
      rmrf.sync(daemonsConf.daemon2.IpfsDataDir)
      rmrf.sync(defaultIpfsDirectory)
      rmrf.sync(defaultOrbitDBDirectory)      
    }

    before(function (done) {
      removeDirectories()
      ipfs1 = new IpfsDaemon(daemonsConf.daemon1)
      ipfs1.on('error', done)
      ipfs1.on('ready', () => {
        assert.equal(hasIpfsApiWithPubsub(ipfs1), true)
        ipfs2 = new IpfsDaemon(daemonsConf.daemon2)
        ipfs2.on('error', done)
        ipfs2.on('ready', () => {
          assert.equal(hasIpfsApiWithPubsub(ipfs2), true)
          client1 = new OrbitDB(ipfs1, databaseName)
          client2 = new OrbitDB(ipfs2, databaseName + '2')
          done()        
        })
      })
    })

    after(() => {
      ipfs1.stop()
      ipfs2.stop()
      removeDirectories()
    })

    describe('two peers', function() {
      beforeEach(() => {
        db1 = client1.eventlog(databaseName, { maxHistory: 0 })
        db2 = client2.eventlog(databaseName, { maxHistory: 0 })
      })

      it('replicates database of 1 entry', (done) => {
        waitForPeers(ipfs1, databaseName + '2')
          .then(async(() => {
            db2.events.on('history', (db, data) => {
              const items = db2.iterator().collect()
              assert.equal(items.length, 1)
              assert.equal(items[0].payload.value, 'hello')
              done()
            })
            db1.add('hello')
          }))
      })

      it('replicates database of 100 entries', (done) => {
        const entryCount = 100
        waitForPeers(ipfs1, databaseName + '2')
          .then(async(() => {
            let count = 0
            db2.events.on('history', (db, data) => {
              count ++
              if (count === entryCount) {
                const items = db2.iterator({ limit: 100 }).collect()
                assert.equal(items.length, entryCount)
                assert.equal(items[0].payload.value, 'hello0')
                assert.equal(_.last(items).payload.value, 'hello99')
                done()
              }
            })

            for(let i = 0; i < entryCount; i ++)
              await(db1.add('hello' + i))
          }))
      })
    })
  })
})
