'use strict'

const IPFS = require('ipfs')
const IPFSRepo = require('ipfs-repo')
const DatastoreLevel = require('datastore-level')
const OrbitDB = require('../src/OrbitDB')
const startIpfs = require('../test/utils/start-ipfs')
const pMapSeries = require('p-map-series')

// Metrics
let metrics2 = {
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
      Interval: 0
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
  preload:{
    enabled: false
  },
  EXPERIMENTAL: {
    sharding: false,
    dht: false,
  },
  config: ipfsConf
})

const conf2 = Object.assign({}, defaultConfig, {
  repo: new IPFSRepo('./orbitdb/benchmarks/replication/client2/ipfs', repoConf)
})

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

pMapSeries([conf2], d => startIpfs('js-ipfs', d))
  .then(async ([ipfs2]) => {
    try {
      // Create the databases
      const orbit2 = await OrbitDB.createInstance(ipfs2.api, { directory: './orbitdb/benchmarks/replication/client2' })
      const address = process.argv[2]
      const db2 = await orbit2.eventlog(address)

      let db2Connected = false

      console.log('Waiting for peers to connect...')

      db2.events.on('peer', () => {
        db2Connected = true
        console.log('Peer 2 connected')
      })

      const startInterval = setInterval(() => {
        if (db2Connected) {
          clearInterval(startInterval)
          // Metrics output for the reader
          let prevCount = 0
          setInterval(() => {
            try {
              metrics2.totalQueries = db2._oplog.length
              metrics2.queriesPerSecond = metrics2.totalQueries - prevCount
              metrics2.lastTenSeconds += metrics2.queriesPerSecond
              prevCount = metrics2.totalQueries

              outputMetrics("READ", db2, metrics2)

              if (db2._oplog.length === updateCount) {
                console.log("Finished")
                process.exit(0)
              }
            } catch (e) {
              console.error(e)
            }
          }, 1000)
        }
      }, 100)
    } catch (e) {
      console.log(e)
      process.exit(1)
    }
  })
