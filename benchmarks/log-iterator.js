import { Identities, Log } from '../src/index.js'
import { MemoryStorage } from '../src/storage/index.js'
// import { MemoryStorage, LevelStorage, LRUStorage } from '../src/storage/index.js'

;(async () => {
  console.log('Starting benchmark...')

  const identities = await Identities()
  const testIdentity = await identities.createIdentity({ id: 'userA' })

  // MemoryStorage is the default storage for Log but defining them here
  // in case we want to benchmark different storage modules
  const entryStorage = await MemoryStorage()
  const headsStorage = await MemoryStorage()
  // Test LRUStorage
  // const entryStorage = await LRUStorage()
  // const headsStorage = await LRUStorage()
  // Test LevelStorage
  // const entryStorage = await LevelStorage({ path: './logA/entries' })
  // const headsStorage = await LevelStorage({ path: './logA/heads' })

  const log = await Log(testIdentity, { logId: 'A', entryStorage, headsStorage })

  const entryCount = 10000

  console.log(`Append ${entryCount} entries`)

  const startTime1 = new Date().getTime()
  for (let i = 0; i < entryCount; i++) {
    await log.append(i.toString(), { pointerCount: 0 })
  }
  const endTime1 = new Date().getTime()
  const duration1 = endTime1 - startTime1
  console.log(`Appending ${entryCount} entries took ${duration1} ms, ${(entryCount / (duration1 / 1000)).toFixed(0)} ops/s, ${(duration1 / entryCount)} ms/op`)

  console.log(`Iterate ${entryCount} entries`)
  const startTime2 = new Date().getTime()
  const all = []
  for await (const entry of log.iterator()) {
    all.unshift(entry)
  }
  const endTime2 = new Date().getTime()
  const duration2 = endTime2 - startTime2

  console.log(`Iterating ${all.length} entries took ${duration2} ms, ${(entryCount / (duration2 / 1000)).toFixed(0)} ops/s, ${(duration2 / entryCount)} ms/op`)
})()
