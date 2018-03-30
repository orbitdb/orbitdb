const IPFSAccessController = require('./ipfs-access-controller')
const OrbitDBAccessController = require('./orbitdb-access-controller')

const create = async (type, databaseAddress, orbitdb, ipfs) => {
  switch (type) {
    case 'ipfs':
      return new IPFSAccessController(ipfs)
      break;
    case 'orbitdb':
      let accessController = new OrbitDBAccessController(orbitdb)
      if (databaseAddress) await accessController.load(databaseAddress)
      return accessController
      break;
    default:
      throw new Error(`Unsupported access controller type '${type}'`)
  }
}

module.exports = {
  create: create,
  load: async (address, orbitdb, ipfs) => {
    const type = address.toString().split('/')[1]
    const accessController = await create(type, null, orbitdb, ipfs)
    await accessController.load(address)
    return accessController
  },
}
