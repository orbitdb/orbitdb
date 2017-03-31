'use strict'

const assert = require('assert')
const mapSeries = require('p-each-series')
const rmrf = require('rimraf')
const OrbitDB = require('../src/OrbitDB')
const config = require('./utils/config')
const startIpfs = require('./utils/start-ipfs')
const stopIpfs = require('./utils/stop-ipfs')
const waitForPeers = require('./utils/wait-for-peers')

const dbPath1 = './orbitdb/tests/replication/1'
const dbPath2 = './orbitdb/tests/replication/2'
const ipfsPath1 = './orbitdb/tests/replication/1/ipfs'
const ipfsPath2 = './orbitdb/tests/replication/2/ipfs'

describe('orbit-db - Replication', function() {
  this.timeout(config.timeout)

  let ipfs1, ipfs2, orbitdb1, orbitdb2, db1, db2

  before(async () => {
    config.daemon1.repo = ipfsPath1
    config.daemon2.repo = ipfsPath2
    rmrf.sync(config.daemon1.repo)
    rmrf.sync(config.daemon2.repo)
    rmrf.sync(dbPath1)
    rmrf.sync(dbPath2)
    ipfs1 = await startIpfs(config.daemon1)
    ipfs2 = await startIpfs(config.daemon2)
    orbitdb1 = new OrbitDB(ipfs1, dbPath1)
    orbitdb2 = new OrbitDB(ipfs2, dbPath2)
  })

  after(async () => {
    if(orbitdb1) 
      await orbitdb1.stop()

    if(orbitdb2) 
      await orbitdb2.stop()

    if (ipfs1)
      await stopIpfs(ipfs1)

    if (ipfs2)
      await stopIpfs(ipfs2)
  })

  describe('two peers', function() {
    beforeEach(async () => {
      let options = { 
        // Set write access for both clients
        write: [
          orbitdb1.key.getPublic('hex'), 
          orbitdb2.key.getPublic('hex')
        ],
      }

      options = Object.assign({}, options, { path: dbPath1 })
      db1 = await orbitdb1.eventlog('replication tests', options)
      // Set 'sync' flag on. It'll prevent creating a new local database and rather
      // fetch the database from the network
      options = Object.assign({}, options, { path: dbPath2, sync: true })
      db2 = await orbitdb2.eventlog(db1.address.toString(), options)

      assert.equal(db1.address.toString(), db2.address.toString())

      await waitForPeers(ipfs1, [orbitdb2.id], db1.address.toString())
      await waitForPeers(ipfs2, [orbitdb1.id], db1.address.toString())
    })

    afterEach(async () => {
      await db1.drop()
      await db2.drop()
    })

    it('replicates database of 1 entry', async () => {
      await db1.add('hello')
      return new Promise(resolve => {
        setTimeout(() => {
          const items = db2.iterator().collect()
          assert.equal(items.length, 1)
          assert.equal(items[0].payload.value, 'hello')
          resolve()
        }, 1000)
      })
    })

    it('replicates database of 100 entries', async () => {
      const entryCount = 100
      const entryArr = []
      let timer

      for (let i = 0; i < entryCount; i ++)
        entryArr.push(i)

      await mapSeries(entryArr, (i) => db1.add('hello' + i))

      return new Promise(resolve => {
        timer = setInterval(() => {
          const items = db2.iterator({ limit: -1 }).collect()
          if (items.length === entryCount) {
            clearInterval(timer)
            assert.equal(items.length, entryCount)
            assert.equal(items[0].payload.value, 'hello0')
            assert.equal(items[items.length - 1].payload.value, 'hello99')
            resolve()
          }
        }, 1000)
      })
    })
  })
})
