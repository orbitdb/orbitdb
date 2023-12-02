import { createOrbitDB } from '../src/index.js'
import { rimraf as rmrf } from 'rimraf'
import * as IPFS from 'ipfs-core'
import connectPeers from '../test/utils/connect-nodes.js'
import waitFor from '../test/utils/wait-for.js'

import { EventEmitter } from 'events'
EventEmitter.defaultMaxListeners = 10000

const ipfsConfig = {
  preload: {
    enabled: false
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
        Enabled: true,
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

  await rmrf('./ipfs1')
  await rmrf('./ipfs2')
  await rmrf('./orbitdb1')
  await rmrf('./orbitdb2')

  const ipfs1 = await IPFS.create({ ...ipfsConfig, repo: './ipfs1' })
  const ipfs2 = await IPFS.create({ ...ipfsConfig, repo: './ipfs2' })
  const orbitdb1 = await createOrbitDB({ ipfs: ipfs1, directory: './orbitdb1' })
  const orbitdb2 = await createOrbitDB({ ipfs: ipfs2, directory: './orbitdb2' })

  await connectPeers(ipfs1, ipfs2)

  console.log(`Add ${entryCount} events`)

  const db1 = await orbitdb1.open('benchmark-replication', { type: 'events' })

  const startTime1 = new Date().getTime()

  for (let i = 0; i < entryCount; i++) {
    await db1.add('hello' + i)
  }

  const endTime1 = new Date().getTime()
  const duration1 = endTime1 - startTime1
  const operationsPerSecond1 = Math.floor(entryCount / (duration1 / 1000))
  const millisecondsPerOp1 = duration1 / entryCount
  console.log(`Adding ${entryCount} events took ${duration1} ms, ${operationsPerSecond1} ops/s, ${millisecondsPerOp1} ms/op`)

  const db2 = await orbitdb2.open(db1.address)

  const startTime2 = new Date().getTime()

  let connected = false

  const onJoin = async (peerId) => (connected = true)

  db2.events.on('join', onJoin)

  await waitFor(() => connected, () => true)

  console.log(`Iterate ${entryCount} events to replicate them`)

  const all = []
  for await (const { value } of db2.iterator()) {
    all.unshift(value)
  }

  const endTime2 = new Date().getTime()
  const duration2 = endTime2 - startTime2
  const operationsPerSecond2 = Math.floor(entryCount / (duration2 / 1000))
  const millisecondsPerOp2 = duration2 / entryCount

  console.log(`Replicating ${all.length} events took ${duration2} ms, ${operationsPerSecond2} ops/s, ${millisecondsPerOp2} ms/op`)

  await db1.drop()
  await db1.close()
  await db2.drop()
  await db2.close()

  await orbitdb1.stop()
  await orbitdb2.stop()
  await ipfs1.stop()
  await ipfs2.stop()

  await rmrf('./ipfs1')
  await rmrf('./ipfs2')
  await rmrf('./orbitdb1')
  await rmrf('./orbitdb2')

  process.exit(0)
})()
