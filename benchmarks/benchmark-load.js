'use strict'

const IPFS = require('ipfs')
const IPFSRepo = require('ipfs-repo')
const DatastoreLevel = require('datastore-level')
const OrbitDB = require('../src/OrbitDB')

console.log("Starting IPFS...")

const repoConf = {
  storageBackends: {
    blocks: DatastoreLevel
  }
}

const ipfs = new IPFS({
  repo: new IPFSRepo('./orbitdb/benchmarks/load/ipfs', repoConf),
  start: false
})

ipfs.on('error', (err) => console.error(err))

ipfs.on('ready', async () => {
  const run = async () => {
    try {
      const orbit = await OrbitDB.createInstance(ipfs, { directory: './orbitdb/benchmarks' })
      const db = await orbit.eventlog('orbit-db.benchmark', { replicate: false })

      const amount = 1000
      console.log('DB entries:', amount)

      console.log('Writing DB...')
      const st1 = new Date().getTime()
      for (let i = 0; i < amount; i++) {
        await db.add('a' + i)
      }
      const et1 = new Date().getTime()
      console.log('writing took', (et1 - st1), 'ms')
      await db.close()

      const db2 = await orbit.eventlog('orbit-db.benchmark', { replicate: false })
      console.log('Loading DB...')
      const st2 = new Date().getTime()
      await db2.load()
      const et2 = new Date().getTime()
      console.log('load took', (et2 - st2), 'ms')
      process.exit(0)
    } catch (e) {
      console.log(e)
      process.exit(1)
    }
  }
  run()
})
