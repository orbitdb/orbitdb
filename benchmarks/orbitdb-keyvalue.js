import { OrbitDB } from '../src/index.js'
import rmrf from 'rimraf'
import * as IPFS from 'ipfs-core'

import { EventEmitter } from 'events'

EventEmitter.defaultMaxListeners = 10000

const ipfsConfig = {
  preload: {
    enabled: false
  },
  EXPERIMENTAL: {
    pubsub: true
  },
  config: {
    Addresses: {
      API: '/ip4/127.0.0.1/tcp/0',
      Swarm: ['/ip4/0.0.0.0/tcp/0'],
      Gateway: '/ip4/0.0.0.0/tcp/0'
    },
    Bootstrap: [],
    Discovery: {
      MDNS: {
        Enabled: false,
        Interval: 0
      },
      webRTCStar: {
        Enabled: false
      }
    }
  }
}

;(async () => {
  console.log('Starting benchmark...')

  const entryCount = 1000

  await rmrf('./ipfs')
  await rmrf('./orbitdb')

  const ipfs = await IPFS.create({ ...ipfsConfig, repo: './ipfs' })
  const orbitdb = await OrbitDB({ ipfs })

  console.log(`Set ${entryCount} keys/values`)

  const db1 = await orbitdb.open('benchmark-keyvalue', { type: 'keyvalue' })

  const startTime1 = new Date().getTime()

  for (let i = 0; i < entryCount; i++) {
    await db1.set(i.toString(), 'hello' + i)
  }

  const endTime1 = new Date().getTime()
  const duration1 = endTime1 - startTime1
  const operationsPerSecond1 = Math.floor(entryCount / (duration1 / 1000))
  const millisecondsPerOp1 = duration1 / entryCount
  console.log(`Setting ${entryCount} key/values took ${duration1} ms, ${operationsPerSecond1} ops/s, ${millisecondsPerOp1} ms/op`)

  console.log(`Iterate ${entryCount} key/values`)
  const startTime2 = new Date().getTime()

  const all = []
  for await (const { key, value } of db1.iterator()) {
    all.unshift({ key, value })
  }

  const endTime2 = new Date().getTime()
  const duration2 = endTime2 - startTime2
  const operationsPerSecond2 = Math.floor(entryCount / (duration2 / 1000))
  const millisecondsPerOp2 = duration2 / entryCount

  console.log(`Iterating ${all.length} key/values took ${duration2} ms, ${operationsPerSecond2} ops/s, ${millisecondsPerOp2} ms/op`)

  await db1.drop()
  await db1.close()

  await orbitdb.stop()
  await ipfs.stop()

  await rmrf('./ipfs')
  await rmrf('./orbitdb')

  process.exit(0)
})()
