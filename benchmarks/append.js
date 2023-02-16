import IdentityProvider from 'orbit-db-identity-provider'
import { Log, MemoryStorage } from '../src/log.js'

// State
let log

// Metrics
let totalQueries = 0
let seconds = 0
let queriesPerSecond = 0
let lastTenSeconds = 0

const queryLoop = async () => {
  await log.append(totalQueries.toString())
  totalQueries++
  lastTenSeconds++
  queriesPerSecond++
  setImmediate(queryLoop)
}

;(async () => {
  console.log('Starting benchmark...')

  const identity = await IdentityProvider.createIdentity({ id: 'userA' })
  // MemoeryStorage is the default storage for Log but defining them here
  // in case we want to benchmark different storage modules
  const storage = await MemoryStorage()
  const stateStorage = await MemoryStorage()

  log = await Log(identity, { logId: 'A', storage, stateStorage })

  // Output metrics at 1 second interval
  setInterval(() => {
    seconds++
    if (seconds % 10 === 0) {
      console.log(`--> Average of ${lastTenSeconds / 10} q/s in the last 10 seconds`)
      if (lastTenSeconds === 0) throw new Error('Problems!')
      lastTenSeconds = 0
    }
    console.log(`${queriesPerSecond} queries per second, ${totalQueries} queries in ${seconds} seconds (Entry count: ${log.values.length})`)
    queriesPerSecond = 0
  }, 1000)

  setImmediate(queryLoop)
})()
