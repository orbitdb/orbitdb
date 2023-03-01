import { Identities } from '../src/index.js'
import { Log } from '../src/index.js'
import { MemoryStorage, LevelStorage } from '../src/storage/index.js'

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

  const identities = await Identities()
  const testIdentity = await identities.createIdentity({ id: 'userA' })

  // MemoryStorage is the default storage for Log but defining them here
  // in case we want to benchmark different storage modules
  const entryStorage = await MemoryStorage()
  const headsStorage = await MemoryStorage()
  // Test LevelStorage
  // const entryStorage = await LevelStorage({ path: './logA/entries' })
  // const headsStorage = await LevelStorage({ path: './logA/heads' })

  log = await Log(testIdentity, { logId: 'A', entryStorage, headsStorage })

  // Output metrics at 1 second interval
  setInterval(() => {
    seconds++
    if (seconds % 10 === 0) {
      console.log(`--> Average of ${lastTenSeconds / 10} q/s in the last 10 seconds`)
      if (lastTenSeconds === 0) throw new Error('Problems!')
      lastTenSeconds = 0
    }
    console.log(`${queriesPerSecond} queries per second, ${totalQueries} queries in ${seconds} seconds`)
    queriesPerSecond = 0
  }, 1000)

  setImmediate(queryLoop)
})()
