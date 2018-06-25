const IPFSAccessController = require('./ipfs-access-controller')
const OrbitDBAccessController = require('./orbitdb-access-controller')
const ContractAccessController = require('./contract-access-controller');

const create = async ({ type, databaseAddress, orbitdb, ipfs, ...rest }) => {
  switch (type) {
    case 'contract':
      return new ContractAccessController({ ...rest, ipfs });
      break;
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
  load: async (address, orbitdb, ipfs, contractAPI, key) => {
    const type = address.toString().split('/')[1]
    const accessController = await create({ type, orbitdb, ipfs, contractAPI, key });
    await accessController.load(address)
    return accessController
  },
}
