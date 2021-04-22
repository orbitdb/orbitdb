'use strict'
async function ipfsOrbitDb (Ipfs, OrbitDb, { dir } = {}) {
  const ipfs = await Ipfs.create({
    repo: dir + '/ipfs',
    config: { Addresses: { Swarm: [], Delegates: [], Bootstrap: [] } }
  })
  const orbitDb = await OrbitDb.createInstance(ipfs, { directory: dir + '/orbitDb' })
  return [ipfs, orbitDb]
}

async function shutdown (ipfs, orbitDb, db) {
  if (db) await db.drop()
  await orbitDb.stop()
  await ipfs.stop()
}

module.exports = {
  ipfsOrbitDb,
  shutdown,
  height: 10000
}
