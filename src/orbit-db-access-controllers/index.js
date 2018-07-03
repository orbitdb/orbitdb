const IPFSAccessController = require('./ipfs-access-controller')
const OrbitDBAccessController = require('./orbitdb-access-controller')
const ContractAccessController = require('./contract-access-controller');

const create = async ({ type, databaseAddress, orbitdb, ipfs, key, keystore, contractAPI }) => {
  switch (type) {
    case 'contract':
      return new ContractAccessController({ key, ipfs, contractAPI });
      break;
    case 'ipfs':
      return new IPFSAccessController(ipfs, key, keystore)
      break;
    case 'orbitdb':
        let accessController = new OrbitDBAccessController(orbitdb, key, keystore)
      if (databaseAddress) await accessController.load(databaseAddress)
      return accessController
      break;
    default:
      throw new Error(`Unsupported access controller type '${type}'`)
  }
}

module.exports = {
  create: create,
  load: async (address, orbitdb, ipfs, contractAPI, key, keystore) => {
    const type = address.toString().split('/')[1]
    const accessController = await create({ type, orbitdb, ipfs, contractAPI, key, keystore });
    await accessController.load(address)
    return accessController
  },
}
