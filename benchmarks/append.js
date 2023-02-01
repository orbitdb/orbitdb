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
  const storage = await MemoryStorage()

  log = await Log(identity, { logId: 'A', storage })

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
