'use strict'

const IpfsApi = require('ipfs-api')
const OrbitDB = require('../src/OrbitDB')

const username = process.argv[2] ? process.argv[2] : 'testrunner'
const channelName = process.argv[3] ? process.argv[3] : 'c1'

// Metrics
let totalQueries = 0
let seconds = 0
let queriesPerSecond = 0
let lastTenSeconds = 0

// Main loop
const queryLoop = (db) => {
  db.add(username + totalQueries).then(() => {
    totalQueries ++
    lastTenSeconds ++
    queriesPerSecond ++
    process.nextTick(() => queryLoop(db))
  })
}

let run = (() => {
    // Connect
    console.log(`Connecting...`)
    const ipfs = IpfsApi('localhost', '5001')
    const orbit = new OrbitDB(ipfs, 'benchmark')
    const db = orbit.eventlog(channelName)

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

    // Start
    queryLoop(db)
})()

module.exports = run
