import { createOrbitDB } from '../src/index.js'
import createHelia from '../test/utils/create-helia.js'
// import { MemoryStorage, LevelStorage, LRUStorage } from '../src/storage/index.js'
import { rimraf as rmrf } from 'rimraf'

let db
let interval

// Metrics
let totalQueries = 0
let seconds = 0
let queriesPerSecond = 0
let lastTenSeconds = 0

// Settings
const benchmarkDuration = 20 // seconds

const queryLoop = async () => {
  const doc = { _id: 'id-' + totalQueries, content: 'hello ' + totalQueries }
  // await db.put(totalQueries.toString(), { referencesCount: 0 })
  await db.put(doc)
  totalQueries++
  lastTenSeconds++
  queriesPerSecond++
  if (interval) {
    setImmediate(queryLoop)
  }
}

;(async () => {
  console.log('Starting benchmark...')

  console.log('Benchmark duration is ' + benchmarkDuration + ' seconds')

  await rmrf('./orbitdb')

  // const identities = await Identities()
  // const testIdentity = await identities.createIdentity({ id: 'userA' })

  const ipfs = await createHelia()
  const orbitdb = await createOrbitDB({ ipfs })

  // MemoryStorage is the default storage for Log but defining them here
  // in case we want to benchmark different storage modules
  // const entryStorage = await MemoryStorage()
  // const headsStorage = await MemoryStorage()
  // const indexStorage = await MemoryStorage()
  // Test LRUStorage
  // const entryStorage = await LRUStorage()
  // const headsStorage = await LRUStorage()
  // const indexStorage = await LRUStorage()
  // Test LevelStorage
  // const entryStorage = await LevelStorage({ path: './logA/entries' })
  // const headsStorage = await LevelStorage({ path: './orbitdb/benchmark-documents-2/heads', valueEncoding: 'json' })
  // const headsStorage = await LevelStorage({ path: './orbitdb/benchmark-documents-2/heads' })
  // const indexStorage = await LevelStorage({ path: './logA/index' })

  // db = await orbitdb.open('benchmark-documents-2', { type: 'documents', entryStorage, headsStorage, indexStorage })
  db = await orbitdb.open('benchmark-documents-2', { type: 'documents' })

  // Output metrics at 1 second interval
  interval = setInterval(async () => {
    seconds++
    console.log(`${queriesPerSecond} queries per second, ${totalQueries} queries in ${seconds} seconds`)
    queriesPerSecond = 0

    if (seconds % 10 === 0) {
      console.log(`--> Average of ${lastTenSeconds / 10} q/s in the last 10 seconds`)
      if (lastTenSeconds === 0) throw new Error('Problems!')
      lastTenSeconds = 0
    }

    if (seconds >= benchmarkDuration) {
      clearInterval(interval)
      interval = null
      process.nextTick(async () => {
        await db.close()
        await orbitdb.stop()
        await rmrf('./orbitdb')
        process.exit(0)
      }, 1000)
    }
  }, 1000)

  setImmediate(queryLoop)
})()
