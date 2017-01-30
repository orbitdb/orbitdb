'use strict'

const assert = require('assert')
const mapSeries = require('./promise-map-series')
const rmrf = require('rimraf')
const hasIpfsApiWithPubsub = require('./test-utils').hasIpfsApiWithPubsub
const OrbitDB = require('../src/OrbitDB')
const config = require('./test-config')

// Daemon settings
const daemonsConf = require('./ipfs-daemons.conf.js')

// orbit-db path
const testDataDir = './orbit-db'

config.daemons.forEach((IpfsDaemon) => {

  describe('orbit-db - Persistency', function() {
    this.timeout(config.timeout)

    let ipfs1, ipfs2, client1, client2, db1, db2

    const removeDirectories = () => {
      rmrf.sync(daemonsConf.daemon1.IpfsDataDir)
      rmrf.sync(daemonsConf.daemon2.IpfsDataDir)
      rmrf.sync(config.defaultIpfsDirectory)
      rmrf.sync(config.defaultOrbitDBDirectory)
      rmrf.sync(testDataDir)
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
          client1 = new OrbitDB(ipfs1, "one")
          client2 = new OrbitDB(ipfs2, "two")
          done()
        })
      })
    })

    after(() => {
      ipfs1.stop()
      ipfs2.stop()
      removeDirectories()
    })

    describe('load', function() {
      it('loads database from local cache', function(done) {
        const entryCount = 100
        const entryArr = []

        for (let i = 0; i < entryCount; i ++)
          entryArr.push(i)

        const options = {
          replicate: false,
          maxHistory: -1,
          cachePath: testDataDir,
        }

        let db = client1.eventlog(config.dbname, options)

        db.events.on('error', done)
        db.load().then(function () {
          mapSeries(entryArr, (i) => db.add('hello' + i))
            .then(function() {
              db = null
              db = client1.eventlog(config.dbname, options)
              db.events.on('error', done)
              db.events.on('ready', () => {
                try {
                  const items = db.iterator({ limit: -1 }).collect()
                  assert.equal(items.length, entryCount)
                  assert.equal(items[0].payload.value, 'hello0')
                  assert.equal(items[entryCount - 1].payload.value, 'hello99')                  
                  done()
                } catch(e) {
                  done(e)
                }
              })
              db.load()
                .catch(done)
            })
            .catch(done)
        }).catch(done)
      })
    })
  })
})
