import { createOrbitDB } from '../src/index.js'
// import { createOrbitDB, MemoryStorage } from '../src/index.js'
import { rimraf as rmrf } from 'rimraf'
import createHelia from '../test/utils/create-helia.js'

import { EventEmitter } from 'events'
EventEmitter.defaultMaxListeners = 10000

;(async () => {
  console.log('Starting benchmark...')

  const entryCount = 1000

  await rmrf('./ipfs')
  await rmrf('./orbitdb')

  const ipfs = await createHelia()
  const orbitdb = await createOrbitDB({ ipfs })

  console.log(`Insert ${entryCount} documents`)

  // const entryStorage = await MemoryStorage()
  // const headsStorage = await MemoryStorage()
  // const indexStorage = await MemoryStorage()

  // const db1 = await orbitdb.open('benchmark-documents', { type: 'documents', referencesCount: 16, entryStorage, headsStorage, indexStorage })

  const db1 = await orbitdb.open('benchmark-documents', { type: 'documents' })

  const startTime1 = new Date().getTime()

  for (let i = 0; i < entryCount; i++) {
    const doc = { _id: i.toString(), message: 'hello ' + i }
    await db1.put(doc)
  }

  const endTime1 = new Date().getTime()
  const duration1 = endTime1 - startTime1
  const operationsPerSecond1 = Math.floor(entryCount / (duration1 / 1000))
  const millisecondsPerOp1 = duration1 / entryCount
  console.log(`Inserting ${entryCount} documents took ${duration1} ms, ${operationsPerSecond1} ops/s, ${millisecondsPerOp1} ms/op`)

  console.log(`Query ${entryCount} documents`)
  const startTime2 = new Date().getTime()

  const all = []
  for await (const { key, value } of db1.iterator()) {
    all.unshift({ key, value })
  }

  const endTime2 = new Date().getTime()
  const duration2 = endTime2 - startTime2
  const operationsPerSecond2 = Math.floor(entryCount / (duration2 / 1000))
  const millisecondsPerOp2 = duration2 / entryCount

  console.log(`Querying ${all.length} documents took ${duration2} ms, ${operationsPerSecond2} ops/s, ${millisecondsPerOp2} ms/op`)

  await db1.drop()
  await db1.close()

  await orbitdb.stop()
  await ipfs.stop()

  await rmrf('./ipfs')
  await rmrf('./orbitdb')

  process.exit(0)
})()
