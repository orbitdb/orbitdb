'use strict'

const assert = require('assert')
const mapSeries = require('p-each-series')
const rmrf = require('rimraf')
const OrbitDB = require('../src/OrbitDB')

// Include test utilities
const {
  config,
  startIpfs,
  stopIpfs,
  testAPIs,
  connectPeers,
  waitForPeers,
} = require('orbit-db-test-utils')

const dbPath1 = './orbitdb/tests/replicate-and-load/1'
const dbPath2 = './orbitdb/tests/replicate-and-load/2'

Object.keys(testAPIs).forEach(API => {
  describe(`orbit-db - Replicate and Load (${API})`, function() {
    this.timeout(config.timeout * 2)

    let ipfsd1, ipfsd2, ipfs1, ipfs2
    let orbitdb1, orbitdb2

    before(async () => {
      rmrf.sync(dbPath1)
      rmrf.sync(dbPath2)
      ipfsd1 = await startIpfs(API, config.daemon1)
      ipfsd2 = await startIpfs(API, config.daemon2)
      ipfs1 = ipfsd1.api
      ipfs2 = ipfsd2.api
      orbitdb1 = await OrbitDB.createInstance(ipfs1, { directory: dbPath1 })
      orbitdb2 = await OrbitDB.createInstance(ipfs2, { directory: dbPath2 })
      // Connect the peers manually to speed up test times
      await connectPeers(ipfs1, ipfs2)
    })

    after(async () => {
      if(orbitdb1)
        await orbitdb1.stop()

      if(orbitdb2)
        await orbitdb2.stop()

      if (ipfsd1)
        await stopIpfs(ipfsd1)

      if (ipfsd2)
        await stopIpfs(ipfsd2)
    })

    describe('two peers', function() {
      let db1, db2

      const openDatabases = async (options) => {
        // Set write access for both clients
        options.write = [
          orbitdb1.identity.publicKey,
          orbitdb2.identity.publicKey
        ],

        options = Object.assign({}, options, { path: dbPath1, create: true })
        db1 = await orbitdb1.eventlog('tests', options)
        // Set 'localOnly' flag on and it'll error if the database doesn't exist locally
        options = Object.assign({}, options, { path: dbPath2 })
        db2 = await orbitdb2.eventlog(db1.address.toString(), options)
      }

      before(async () => {
        await openDatabases({ sync: true })

        assert.equal(db1.address.toString(), db2.address.toString())

        console.log("Waiting for peers...")
        await waitForPeers(ipfs1, [orbitdb2.id], db1.address.toString())
        await waitForPeers(ipfs2, [orbitdb1.id], db1.address.toString())
        console.log("Found peers")
      })

      after(async () => {
        await db1.drop()
        await db2.drop()
      })

      it('replicates database of 100 entries and loads it from the disk', async () => {
        const entryCount = 100
        const entryArr = []
        let timer

        for (let i = 0; i < entryCount; i ++)
          entryArr.push(i)

        console.log("Writing to database...")
        await mapSeries(entryArr, (i) => db1.add('hello' + i))
        console.log("Done")

        return new Promise((resolve, reject) => {
          timer = setInterval(async () => {
            if (db2._oplog.length === entryCount) {
              clearInterval(timer)

              const items = db2.iterator({ limit: -1 }).collect()
              assert.equal(items.length, entryCount)
              assert.equal(items[0].payload.value, 'hello0')
              assert.equal(items[items.length - 1].payload.value, 'hello99')

              try {

                // Set write access for both clients
                let options = {
                  accessController: {
                    write: [
                      orbitdb1.identity.id,
                      orbitdb2.identity.id
                    ]
                  }
                }

                // Get the previous address to make sure nothing mutates it
                const addr = db1.address.toString()

                // Open the database again (this time from the disk)
                options = Object.assign({}, options, { path: dbPath1, create: false })
                const db3 = await orbitdb1.eventlog(addr, options)
                // Set 'localOnly' flag on and it'll error if the database doesn't exist locally
                options = Object.assign({}, options, { path: dbPath2, localOnly: true })
                const db4 = await orbitdb2.eventlog(addr, options)

                await db3.load()
                await db4.load()

                // Make sure we have all the entries in the databases
                const result1 = db3.iterator({ limit: -1 }).collect()
                const result2 = db4.iterator({ limit: -1 }).collect()
                assert.equal(result1.length, entryCount)
                assert.equal(result2.length, entryCount)

                await db3.drop()
                await db4.drop()
              } catch (e) {
                reject(e)
              }
              resolve()
            }
          }, 100)
        })
      })
    })
  })
})
