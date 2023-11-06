/**
 * @module AccessControllers
 * @description
 * Provides a system for managing access controllers. Supported access
 * controllers can be added and removed from the access controller list, and
 * can load the associated module if they are supported.
 */
import IPFSAccessController from './ipfs.js'
import OrbitDBAccessController from './orbitdb.js'

const accessControllers = {}

/**
 * Gets an access controller module specified by type.
 * @param {string} type A valid access controller type.
 * @return {AccessController} The access controller module.
 * @private
 */
const getAccessController = (type) => {
  if (!accessControllers[type]) {
    throw new Error(`AccessController type '${type}' is not supported`)
  }
  return accessControllers[type]
}

/**
 * Adds an access controller module to the list of supported access controller.
 * @param {AccessController} accessController A compatible access controller
 * module.
 * @throws AccessController does not contain required field \'type\'.
 * @throws AccessController '${accessController.type}' already added.
 * @static
 */
const useAccessController = (accessController) => {
  if (!accessController.type) {
    throw new Error('AccessController does not contain required field \'type\'.')
  }

  accessControllers[accessController.type] = accessController
}

useAccessController(IPFSAccessController)
useAccessController(OrbitDBAccessController)

export {
  getAccessController,
  useAccessController,
  IPFSAccessController,
  OrbitDBAccessController
}
