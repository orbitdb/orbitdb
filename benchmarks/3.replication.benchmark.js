'use strict'
const Ipfs = require('ipfs')
const OrbitDb = require('../src/OrbitDB.js')
const { ipfsOrbitDb, shutdown, height } = require('./util')

const options = { overwrite: true }
const openLog = async (orbitDb, name, opts = options) => {
  const address = await orbitDb.determineAddress(name, 'eventlog', opts)
  return orbitDb.open(address, opts)
}

async function benchmark (benchmarker) {
  const [ipfs, orbitDb] = await ipfsOrbitDb(Ipfs, OrbitDb, { dir: benchmarker.dir })

  let i = 0
  let entries = 0
  benchmarker.trackMemory()
  benchmarker.addMetric({
    name: 'replicated entries',
    get: () => i
  })
  benchmarker.addMetric({
    name: 'replicated entries per second',
    get: () => {
      const perSecond = i - entries
      entries = i
      benchmarker.log(
`entries replicated in last second:  ${perSecond}
entries replicated:                 ${entries}
`
      )
      return perSecond
    }
  })

  await ipfs.swarm.connect(benchmarker.info.hook.multiaddr)
  const log = await orbitDb.open(benchmarker.info.hook.dbaddr, options)

  benchmarker.startRecording()
  await new Promise(resolve => {
    log.events.on('replicate.progress', () => i++)
    log.events.on('replicated', () => log._oplog.length === height ? resolve() : null)
  })
  benchmarker.stopRecording()

  await shutdown(ipfs, orbitDb, log)
}

async function hook ({ dir }) {
  const path = require('path')
  const ipfs = await Ipfs.create({
    repo: path.join(dir, 'hook/ipfs'),
    config: { Addresses: { Swarm: ['/ip4/127.0.0.1/tcp/0/ws'] } }
  })
  const orbitDb = await OrbitDb.createInstance(
    ipfs,
    { directory: path.join(dir, 'hook/orbitDb') }
  )

  const log = await openLog(orbitDb, 'replica')

  console.log('hook is writing entries to be replicated...')
  for (let i = 0; i < height; i++) {
    await log.add(Date.now().toString(), { pin: false })
  }

  const stop = async () => shutdown(ipfs, orbitDb, log)

  return {
    info: {
      multiaddr: (await ipfs.id()).addresses[0].toString(),
      dbaddr: log.address.toString()
    },
    stop
  }
}

module.exports = {
  benchmark,
  hook
}
