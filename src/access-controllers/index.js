import AccessController from './interface.js'
import AccessControllerManifest from './manifest.js'
// import LegacyIPFSAccessController from './access-controllers/legacy-ipfs.js'
import IPFSAccessController from './ipfs.js'
// import OrbitDBAccessController from './orbitdb.js'

const supportedTypes = {
  // 'legacy-ipfs': LegacyIPFSAccessController,
  ipfs: IPFSAccessController
  // orbitdb: OrbitDBAccessController
}

const getHandlerFor = (type) => {
  if (!AccessControllers.isSupported(type)) {
    throw new Error(`AccessController type '${type}' is not supported`)
  }
  return supportedTypes[type]
}

export default class AccessControllers {
  static get AccessController () { return AccessController }

  static isSupported (type) {
    return Object.keys(supportedTypes).includes(type)
  }

  static addAccessController (options) {
    if (!options.AccessController) {
      throw new Error('AccessController class needs to be given as an option')
    }

    if (!options.AccessController.type ||
      typeof options.AccessController.type !== 'string') {
      throw new Error('Given AccessController class needs to implement: static get type() { /* return a string */}.')
    }

    supportedTypes[options.AccessController.type] = options.AccessController
  }

  static addAccessControllers (options) {
    const accessControllers = options.AccessControllers
    if (!accessControllers) {
      throw new Error('AccessController classes need to be given as an option')
    }

    accessControllers.forEach((accessController) => {
      AccessControllers.addAccessController({ AccessController: accessController })
    })
  }

  static removeAccessController (type) {
    delete supportedTypes[type]
  }

  static async resolve (orbitdb, manifestAddress, options = {}) {
    const { type, params } = await AccessControllerManifest.resolve(orbitdb._ipfs, manifestAddress, options)
    const AccessController = getHandlerFor(type)
    const accessController = await AccessController.create(orbitdb, Object.assign({}, options, params))
    await accessController.load(params.address)
    return accessController
  }

  static async create ({ ipfs, identity }, type, options = {}) {
    const AccessController = getHandlerFor(type)
    const ac = await AccessController.create({ ipfs, identity }, options)
    const params = await ac.save()
    const hash = await AccessControllerManifest.create(ipfs, type, params)
    return hash
  }
}
