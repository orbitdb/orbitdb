'use strict'

const fs = require('fs')
const rmrf = require('rimraf')
const path = require('path')
const assert = require('assert')
const pMap = require('p-map')
const pEachSeries = require('p-each-series')
const pWhilst = require('p-whilst')
const OrbitDB = require('../src/OrbitDB')
const startIpfs = require('./utils/start-ipfs')

// Settings for the test ipfs daemons
const config = require('./utils/config.js')

describe.skip('OrbitDB - Network Stress Tests', function() {
  // We need a huge timeout since we're running
  // very long-running tests (takes minutes)
  this.timeout(1000 * 60 * 60) // 1 hour

  const tests = [
    {
      description: '1 update - 2 peers - as fast as possible',
      updates: 1,
      maxInterval: -1,
      minInterval: 0,
      sequential: false,
      content: 'Hello #',
      clients: [
        { name: 'daemon1' },
        { name: 'daemon2' },
        // { name: 'daemon3' },
        // { name: 'daemon4' },
        // { name: 'daemon5' },
        // { name: 'daemon6' },
        // Don't go beyond 6...
        // { name: 'daemon7' },
        // { name: 'daemon8' },
      ],
    },
    {
      description: '32 update - concurrent - 2 peers - random interval',
      updates: 32,
      maxInterval: 2000,
      minInterval: 10,
      sequential: false,
      content: 'Hello random! ',
      clients: [
        { name: 'daemon1' },
        { name: 'daemon2' },
      ],
    },
    {
      description: '1000 update concurrently - 2 peers - as fast as possible',
      updates: 1000,
      maxInterval: -1,
      minInterval: 0,
      sequential: false,
      content: 'Hello #',
      clients: [
        { name: 'daemon1' },
        { name: 'daemon2' },
      ],
    },
    {
      description: '200 update as Buffers sequentially - 2 peers - as fast as possible',
      updates: 200,
      maxInterval: -1,
      minInterval: 0,
      sequential: true,
      content: Buffer.from('👻'),
      clients: [
        { name: 'daemon1' },
        { name: 'daemon2' },
      ],
    },
    {
      description: '50 update over a period long time - 6 peers - slow, random write intervals',
      updates: 50,
      maxInterval: 3000,
      minInterval: 1000,
      sequential: false,
      content: 'Terve! ',
      clients: [
        { name: 'daemon1' },
        { name: 'daemon2' },
        { name: 'daemon3' },
        { name: 'daemon4' },
        { name: 'daemon5' },
        { name: 'daemon6' },
      ],
    },
    {
      description: '50 update over a period long time - 8 peers - slow, random write intervals',
      updates: 100,
      maxInterval: 3000,
      minInterval: 1000,
      sequential: false,
      content: 'Terve! ',
      clients: [
        { name: 'daemon1' },
        { name: 'daemon2' },
        { name: 'daemon3' },
        { name: 'daemon4' },
        { name: 'daemon5' },
        { name: 'daemon6' },
        { name: 'daemon7' },
        { name: 'daemon8' },
      ],
    },
  ]

  const rootPath = './orbitdb/network-tests/'
  const channelName = 'orbitdb-network-stress-tests'

  tests.forEach(test => {
    it(test.description, (done) => {
      const updateCount = test.updates
      const maxInterval = test.maxInterval || -1
      const minInterval = test.minInterval || 0
      const sequential = test.sequential
      const clientData = test.clients

      rmrf.sync(rootPath)

      // Create IPFS instances
      const createIpfsInstance = (c) => {
        const repoPath = path.join(rootPath, c.name, '/ipfs' + new Date().getTime())
        console.log("Starting IPFS instance <<>>", repoPath)
        return startIpfs(Object.assign({}, config.defaultIpfsConfig, {
          repo: repoPath,
          start: true,
        }))
      }

      const createOrbitDB = async (databaseConfig, ipfs) => {
        const orbitdb = new OrbitDB(ipfs, path.join('./orbitdb/network-tests/', databaseConfig.name))
        const db = await orbitdb.eventlog(databaseConfig.address, {
          write: ['*']
        })
        return db
      }

      let allTasks = []

      const setupAllTasks = (databases) => {
        // Create the payloads
        let texts = []
        for (let i = 1; i < updateCount + 1; i ++) {
          texts.push(test.content + i)
        }

        const setupUpdates = (client) => texts.reduce((res, acc) => {
          return res.concat([{ db: client, content: acc }])
        }, [])

        allTasks = databases.map(db => {
          return {
            name: db.id,
            tasks: setupUpdates(db),
          }
        })
      }

      const runAllTasks = () => {
        if (sequential) {
          return pEachSeries(allTasks, e => pEachSeries(e.tasks, writeToDB))
            .then(() => console.log())
        } else {
          return pMap(allTasks, e => pEachSeries(e.tasks, writeToDB))
            .then(() => console.log())
        }
      }

      let i = 0
      const writeToDB = (task) => {
        return new Promise((resolve, reject) => {
          if (maxInterval === -1) {
            task.db.add(task.content)
              .then(() => process.stdout.write(`\rUpdates (${databases.length} peers): ${Math.floor(++i)} / ${updateCount}`))
              .then(resolve)
              .catch(reject)
          } else {
            setTimeout(() => {
              task.db.add(task.content)
                .then(() => process.stdout.write(`\rUpdates (${databases.length} peers): ${Math.floor(++i)} / ${updateCount}`))
                .then(resolve)
                .catch(reject)
            }, Math.floor(Math.random() * maxInterval) + minInterval)
          }
        })
      }

      const waitForAllTasks = (address) => {
        let msgCount = 0
        return pWhilst(
          () => msgCount < databases.length * databases.length * updateCount,
          () => new Promise(resolve => {
            return queryDatabases(address)
              .then(res => {
                msgCount = res.reduce((val, acc) => val += acc.length, 0)
              })
              .then(() => process.stdout.write(`\rUpdated (${databases.length} peers): ` + msgCount.toString() + ' / ' + (updateCount * databases.length * databases.length)))
              .then(() => setTimeout(resolve, 100))
          })
        )
        .then(() => process.stdout.write(`\rUpdated (${databases.length} peers): ` + msgCount.toString() + ' / ' + (updateCount * databases.length * databases.length) + '\n'))
      }

      const queryDatabases = () => {
        return pMap(databases, db => db.iterator({ limit: -1 }).collect(), { concurrency: 2 })
      }

      // All our databases instances
      let databases = []
      let addr

      // Start the test
      pMap(clientData, (c, idx) => {
        return createIpfsInstance(c)
          .then(async (ipfs) => {
            let db
            if (idx === 0 && !addr) {
              c.address = channelName
              db = await createOrbitDB(c, ipfs)
              addr = db.address.toString()
            } else if (addr) {
              c.address = addr
              db = await createOrbitDB(c, ipfs)
            } else {
              console.error("Address not defined!")
            }
            return db
          })
      }, { concurrency: 1 })
      .then((result) => databases = result)
      .then(() => setupAllTasks(databases))
      .then(() => console.log(`Applying ${updateCount} updates per peer. This will take a while...`))
      .then(() => runAllTasks())
      .then(() => console.log('Done. Waiting for all updates to reach the peers...'))
      .then(() => waitForAllTasks(addr))
      .then(() => queryDatabases())
      .then((result) => {
        // Both databases have the same amount of entries
        result.forEach(entries => {
          assert.equal(entries.length, updateCount * databases.length)
        })

        // Both databases have the same entries in the same order
        result.reduce((prev, entries) => {
          assert.deepEqual(entries, prev)
          return entries
        }, result[0])

        // Success! Cleanup and finish
        pEachSeries(databases, db => {
          db.close()
          db._ipfs.stop()
        })
          .then(() => done())
      })
      .catch(done)
    })
  })
})
