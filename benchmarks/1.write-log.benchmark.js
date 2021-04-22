'use strict'
const Ipfs = require('ipfs')
const OrbitDb = require('../src/OrbitDB.js')
const { ipfsOrbitDb, shutdown, height } = require('./util')

const options = { replicate: false, overwrite: true }
const openLog = (orbitDb) => orbitDb.create('log', 'eventlog', options)

async function benchmark (benchmarker) {
  const [ipfs, orbitDb] = await ipfsOrbitDb(Ipfs, OrbitDb, { dir: benchmarker.dir })
  const log = await openLog(orbitDb)

  let i = 0
  let entries = 0
  benchmarker.trackMemory()
  benchmarker.addMetric({
    name: 'writes',
    get: () => i
  })
  benchmarker.addMetric({
    name: 'writes per second',
    get: () => {
      const perSecond = i - entries
      entries = i
      benchmarker.log(
`entries in last second:  ${perSecond}
entry height:            ${entries}
`
      )
      return perSecond
    }
  })

  benchmarker.startRecording()
  for (; i < height; i++) {
    await log.add(Date.now().toString(), { pin: false })
  }
  benchmarker.stopRecording()

  await log.close()
  await shutdown(ipfs, orbitDb)
}

module.exports = {
  benchmark
}
