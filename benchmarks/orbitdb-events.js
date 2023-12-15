import { createOrbitDB } from '../src/index.js'
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

  console.log(`Create ${entryCount} events`)

  const db1 = await orbitdb.open('benchmark-events')

  const startTime1 = new Date().getTime()

  for (let i = 0; i < entryCount; i++) {
    await db1.add(i.toString())
  }

  const endTime1 = new Date().getTime()
  const duration1 = endTime1 - startTime1
  const operationsPerSecond1 = Math.floor(entryCount / (duration1 / 1000))
  const millisecondsPerOp1 = duration1 / entryCount
  console.log(`Creating ${entryCount} events took ${duration1} ms, ${operationsPerSecond1} ops/s, ${millisecondsPerOp1} ms/op`)

  console.log(`Iterate ${entryCount} events`)
  const startTime2 = new Date().getTime()

  const all = []
  for await (const { key, value } of db1.iterator()) {
    all.unshift({ key, value })
  }

  const endTime2 = new Date().getTime()
  const duration2 = endTime2 - startTime2
  const operationsPerSecond2 = Math.floor(entryCount / (duration2 / 1000))
  const millisecondsPerOp2 = duration2 / entryCount

  console.log(`Iterating ${all.length} events took ${duration2} ms, ${operationsPerSecond2} ops/s, ${millisecondsPerOp2} ms/op`)

  await db1.drop()
  await db1.close()

  await orbitdb.stop()
  await ipfs.stop()

  await rmrf('./ipfs')
  await rmrf('./orbitdb')

  process.exit(0)
})()
