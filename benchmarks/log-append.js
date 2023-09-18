import { Identities, Log } from '../src/index.js'
import { MemoryStorage } from '../src/storage/index.js'
// import { MemoryStorage, LevelStorage, LRUStorage } from '../src/storage/index.js'
import { rimraf as rmrf } from 'rimraf'

// State
let log

// Metrics
let totalQueries = 0
let seconds = 0
let queriesPerSecond = 0
let lastTenSeconds = 0

// Settings
const benchmarkDuration = 20 // seconds

const queryLoop = async () => {
  await log.append(totalQueries.toString(), { referencesCount: 0 })
  totalQueries++
  lastTenSeconds++
  queriesPerSecond++
  setImmediate(queryLoop)
}

;(async () => {
  console.log('Starting benchmark...')

  console.log('Benchmark duration is ' + benchmarkDuration + ' seconds')

  await rmrf('./orbitdb')

  const identities = await Identities()
  const testIdentity = await identities.createIdentity({ id: 'userA' })

  // MemoryStorage is the default storage for Log but defining them here
  // in case we want to benchmark different storage modules
  const entryStorage = await MemoryStorage()
  const headsStorage = await MemoryStorage()
  const indexStorage = await MemoryStorage()
  // Test LRUStorage
  // const entryStorage = await LRUStorage()
  // const headsStorage = await LRUStorage()
  // const indexStorage = await LRUStorage()
  // Test LevelStorage
  // const entryStorage = await LevelStorage({ path: './logA/entries' })
  // const headsStorage = await LevelStorage({ path: './logA/heads' })
  // const indexStorage = await LevelStorage({ path: './logA/index' })

  log = await Log(testIdentity, { logId: 'A', entryStorage, headsStorage, indexStorage })

  // Output metrics at 1 second interval
  const interval = setInterval(async () => {
    seconds++
    if (seconds % 10 === 0) {
      console.log(`--> Average of ${lastTenSeconds / 10} q/s in the last 10 seconds`)
      if (lastTenSeconds === 0) throw new Error('Problems!')
      lastTenSeconds = 0
    }
    if (seconds >= benchmarkDuration) {
      clearInterval(interval)
      await rmrf('./orbitdb')
      process.exit(0)
    }
    console.log(`${queriesPerSecond} queries per second, ${totalQueries} queries in ${seconds} seconds`)
    queriesPerSecond = 0
  }, 1000)

  setImmediate(queryLoop)
})()
