'use strict'

const IpfsDaemon = require('ipfs-daemon/src/ipfs-node-daemon')
const OrbitDB = require('../src/OrbitDB')

// Metrics
let totalQueries = 0
let seconds = 0
let queriesPerSecond = 0
let lastTenSeconds = 0

// Main loop
const queryLoop = (db) => {
  db.add(totalQueries)
    .then(() => {
      totalQueries ++
      lastTenSeconds ++
      queriesPerSecond ++
      setImmediate(() => queryLoop(db))
    })
    .catch((e) => console.error(e))
}

// Start
console.log("Starting IPFS daemon...")

const ipfs = new IpfsDaemon()

ipfs.on('error', (err) => console.error(err))

ipfs.on('ready', () => {
  const orbit = new OrbitDB(ipfs, 'benchmark')
  const db = orbit.eventlog('orbit-db.benchmark', { maxHistory: 100 })

  // Metrics output
  setInterval(() => {
    seconds ++
    if(seconds % 10 === 0) {
      console.log(`--> Average of ${lastTenSeconds/10} q/s in the last 10 seconds`)
      if(lastTenSeconds === 0)
        throw new Error("Problems!")
      lastTenSeconds = 0
    }
    console.log(`${queriesPerSecond} queries per second, ${totalQueries} queries in ${seconds} seconds`)
    queriesPerSecond = 0
  }, 1000)

  // Start the main loop
  queryLoop(db)
})
