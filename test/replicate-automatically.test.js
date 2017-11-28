'use strict'

const assert = require('assert')
const mapSeries = require('p-each-series')
const rmrf = require('rimraf')
const OrbitDB = require('../src/OrbitDB')
const config = require('./utils/config')
const startIpfs = require('./utils/start-ipfs')
const stopIpfs = require('./utils/stop-ipfs')
const waitForPeers = require('./utils/wait-for-peers')

const dbPath1 = './orbitdb/tests/replicate-automatically/1'
const dbPath2 = './orbitdb/tests/replicate-automatically/2'
const ipfsPath1 = './orbitdb/tests/replicate-automatically/1/ipfs'
const ipfsPath2 = './orbitdb/tests/replicate-automatically/2/ipfs'

describe('orbit-db - Automatic Replication', function() {
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

  beforeEach(async () => {
    let options = {}
    // Set write access for both clients
    options.write = [
      orbitdb1.key.getPublic('hex'), 
      orbitdb2.key.getPublic('hex')
    ],

    options = Object.assign({}, options, { path: dbPath1 })
    db1 = await orbitdb1.eventlog('replicate-automatically-tests', options)
  })

  afterEach(async () => {
    await db1.drop()
    await db2.drop()
  })

  it('starts replicating the database when peers connect', async () => {
    const entryCount = 10
    const entryArr = []
    let options = {}
    let timer

    // Create the entries in the first database
    for (let i = 0; i < entryCount; i ++)
      entryArr.push(i)

    await mapSeries(entryArr, (i) => db1.add('hello' + i))

    // Open the second database
    options = Object.assign({}, options, { path: dbPath2, sync: true })
    db2 = await orbitdb2.eventlog(db1.address.toString(), options)

    // Listen for the 'replicated' events and check that all the entries
    // were replicated to the second database
    return new Promise((resolve, reject) => {
      db2.events.on('replicated', (address) => {
        try {
          const result1 = db1.iterator({ limit: -1 }).collect()
          const result2 = db2.iterator({ limit: -1 }).collect()
          // Make sure we have all the entries
          if (result1.length === entryCount && result2.length === entryCount) {
            assert.deepEqual(result1, result2)
            resolve()
          }
        } catch (e) {
          reject(e)
        }
      })
    })
  })
})
