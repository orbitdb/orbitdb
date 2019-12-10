'use strict'

const IPFS = require('ipfs')
const IPFSRepo = require('ipfs-repo')
const DatastoreLevel = require('datastore-level')
const OrbitDB = require('../src/OrbitDB')
const startIpfs = require('../test/utils/start-ipfs')
const pMapSeries = require('p-map-series')

// Metrics
let metrics1 = {
  totalQueries: 0,
  seconds: 0,
  queriesPerSecond: 0,
  lastTenSeconds: 0,
}

const ipfsConf = {
  Addresses: {
    API: '/ip4/127.0.0.1/tcp/0',
    Swarm: ['/ip4/0.0.0.0/tcp/0'],
    Gateway: '/ip4/0.0.0.0/tcp/0'
  },
  Bootstrap: [],
  Discovery: {
    MDNS: {
      Enabled: true,
      Interval: 1
    },
  },
}

const repoConf = {
  storageBackends: {
    blocks: DatastoreLevel,
  },
}

const defaultConfig = Object.assign({}, {
  start: true,
  preload: {
    enabled: false
  },
  EXPERIMENTAL: {
    sharding: false,
    dht: false,
  },
  config: ipfsConf
})

const conf1 = Object.assign({}, defaultConfig, {
  repo: new IPFSRepo('./orbitdb/benchmarks/replication/client1/ipfs', repoConf)
})

// Write loop
const queryLoop = async (db) => {
  if (metrics1.totalQueries < updateCount) {
    try {
      await db.add(metrics1.totalQueries)
    } catch (e) {
        console.error(e)
    }
    metrics1.totalQueries ++
    metrics1.lastTenSeconds ++
    metrics1.queriesPerSecond ++
    setImmediate(() => queryLoop(db))
  }
}

// Metrics output function
const outputMetrics = (name, db, metrics) => {
    metrics.seconds ++
    console.log(`[${name}] ${metrics.queriesPerSecond} queries per second, ${metrics.totalQueries} queries in ${metrics.seconds} seconds (Oplog: ${db._oplog.length})`)
    metrics.queriesPerSecond = 0

    if(metrics.seconds % 10 === 0) {
      console.log(`[${name}] --> Average of ${metrics.lastTenSeconds/10} q/s in the last 10 seconds`)
      metrics.lastTenSeconds = 0
    }
}

const database = 'benchmark-replication'
const updateCount = 20000

// Start
console.log("Starting IPFS daemons...")

pMapSeries([conf1,], d => startIpfs('js-ipfs', d))
  .then(async ([ipfs1]) => {
    try {
      // Create the databases
      const orbit1 = await OrbitDB.createInstance(ipfs1.api, { directory: './orbitdb/benchmarks/replication/client1' })
      const db1 = await orbit1.eventlog(database, { overwrite: true })
      console.log(db1.address.toString())

      let db1Connected = false

      console.log('Waiting for peers to connect...')

      db1.events.on('peer', () => {
        db1Connected = true
        console.log('Peer 1 connected')
      })

      const startInterval = setInterval(() => {
        if (db1Connected) {
          clearInterval(startInterval)
          // Start the write loop
          queryLoop(db1)

          // Metrics output for the writer, once/sec
          const writeInterval = setInterval(() => {
            outputMetrics("WRITE", db1, metrics1)
            if (metrics1.totalQueries === updateCount) {
              clearInterval(writeInterval)
            }
          }, 1000)
        }
      }, 100)
    } catch (e) {
      console.log(e)
      process.exit(1)
    }
  })
