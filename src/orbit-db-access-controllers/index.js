const IPFSAccessController = require('./ipfs-access-controller')
const OrbitDBAccessController = require('./orbitdb-access-controller')

const create = async (type, forId, orbitdb, ipfs) => {
  let accessController
  if (type === 'ipfs') {
    accessController = new IPFSAccessController(ipfs)
  } else if (type === 'orbitdb') {
    accessController = new OrbitDBAccessController(orbitdb)
    if (forId)
      await accessController.init(forId)
  }
  return accessController
}

module.exports = {
  create: async (type, name, orbitdb, ipfs) => {
    const accessController = await create(type, name, orbitdb, ipfs)
    return accessController
  },
  load: async (address, orbitdb, ipfs) => {
    const type = address.toString().split('/')[1]
    const accessController = await create(type, null, orbitdb, ipfs)
    await accessController.load(address)
    return accessController
  }
}
