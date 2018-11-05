'use strict'
const ContractAccessController = require('./contract-access-controller')
const IPFSAccessController = require('./ipfs-access-controller')

class ACFactory {

  static async resolve(ipfs, acManifest, acOptions) {
    let accessController
    try {
      if (acManifest.indexOf('/ipfs') === 0)
        acManifest = acManifest.split('/')[2]
        
      const dag = await ipfs.object.get(acManifest)
      const manifest = JSON.parse(dag.toJSON().data)
      let acParameters = Object.assign({}, acOptions, manifest.acParameters)

      switch(manifest.type) {
        case 'eth-contract':
          accessController = new ContractAccessController(acParameters)
          await accessController.load()
        break
        case 'ipfs':
          accessController = new IPFSAccessController(ipfs)
          await accessController.load(acParameters.accessObjectAddress)
          break
        default:
          throw new Error('AC type is required')
      }
    } catch (e) {
      console.log("ACFactory RESOLVE ERROR:", e)
    }
    return accessController
  }

  static async create(ipfs, options = {}) {
    let accessControllerParameters
    const acOptions = options.acOptions || {}
    const type = acOptions.type || 'ipfs'
    switch(type) {
      case 'eth-contract':
        accessControllerParameters = Object.assign({}, { contractAddress: acOptions.contractAddress, abi: acOptions.abi })
        break
      case 'ipfs':
        const accessController = new IPFSAccessController(ipfs)
        options.write.forEach(e => accessController.add('write', e))
        const accessObjectAddress = await accessController.save()
        accessControllerParameters = Object.assign({}, { accessObjectAddress: accessObjectAddress})
        break
      default:
        throw new Error('AC type is required')
    }
    return await ACFactory.createACManifest(ipfs, type, accessControllerParameters)
  }

  static async createACManifest(ipfs, type, accessControllerParameters) {
    const manifest = {
      type: type,
      acParameters: accessControllerParameters,
    }
    let dag
    try {
      dag = await ipfs.object.put(Buffer.from(JSON.stringify(manifest)))
    } catch (e) {
      console.log("ACFactory WRITE MANIFEST ERROR:", e)
    }
    return dag.toJSON().multihash.toString()
  }
}

module.exports = ACFactory
