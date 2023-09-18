import { Identities, Log } from '../src/index.js'
import { MemoryStorage } from '../src/storage/index.js'
// import { MemoryStorage, LevelStorage, LRUStorage } from '../src/storage/index.js'
import { rimraf as rmrf } from 'rimraf'

;(async () => {
  console.log('Starting benchmark...')

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

  const log = await Log(testIdentity, { logId: 'A', entryStorage, headsStorage, indexStorage })

  const entryCount = 10000

  console.log(`Append ${entryCount} entries`)

  const startTime1 = new Date().getTime()
  for (let i = 0; i < entryCount; i++) {
    await log.append(i.toString(), { referencesCount: 0 })
  }
  const endTime1 = new Date().getTime()
  const duration1 = endTime1 - startTime1
  const operationsPerSecond1 = Math.floor(entryCount / (duration1 / 1000))
  const millisecondsPerOp1 = duration1 / entryCount

  console.log(`Appending ${entryCount} entries took ${duration1} ms, ${operationsPerSecond1} ops/s, ${millisecondsPerOp1} ms/op`)

  console.log(`Iterate ${entryCount} entries`)
  const startTime2 = new Date().getTime()
  const all = []
  for await (const entry of log.iterator()) {
    all.unshift(entry)
  }
  const endTime2 = new Date().getTime()
  const duration2 = endTime2 - startTime2
  const operationsPerSecond2 = Math.floor(entryCount / (duration2 / 1000))
  const millisecondsPerOp2 = duration2 / entryCount

  console.log(`Iterating ${all.length} entries took ${duration2} ms, ${operationsPerSecond2} ops/s, ${millisecondsPerOp2} ms/op`)

  await rmrf('./orbitdb')

  process.exit(0)
})()
