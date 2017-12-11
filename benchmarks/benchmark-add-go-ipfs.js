'use strict'

const IPFS = require('ipfs-api')
const OrbitDB = require('../src/OrbitDB')

// Metrics
let totalQueries = 0
let seconds = 0
let queriesPerSecond = 0
let lastTenSeconds = 0

// Main loop
const queryLoop = async (db) => {
  await db.add(totalQueries)
  totalQueries ++
  lastTenSeconds ++
  queriesPerSecond ++
  setImmediate(() => queryLoop(db))
}

// Start
console.log("Starting...")

// Make sure you have a local IPFS daemon running!
const ipfs = IPFS('127.0.0.1')

const run = async () => {
  try {
    const orbit = new OrbitDB(ipfs, './orbitdb/benchmarks')
    const db = await orbit.eventlog('orbit-db.benchmark', { 
      replicate: false,
    })

    // Metrics output
    setInterval(() => {
      seconds ++
      if(seconds % 10 === 0) {
        console.log(`--> Average of ${lastTenSeconds/10} q/s in the last 10 seconds`)
        if(lastTenSeconds === 0)
          throw new Error("Problems!")
        lastTenSeconds = 0
      }
      console.log(`${queriesPerSecond} queries per second, ${totalQueries} queries in ${seconds} seconds (Oplog: ${db._oplog.length})`)
      queriesPerSecond = 0
    }, 1000)
    // Start the main loop
    queryLoop(db)
  } catch (e) {
    console.log(e)
    process.exit(1)
  }
}

run()
