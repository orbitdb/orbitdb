/**
 * @module AccessControllers
 * @description
 * Provides a platform for managing access controllers. Supported access
 * controllers can be added and removed from the access controller list, and
 * can load the associated module if they are supported.
 *
 * An AccessController module needs to only expose one function,
 * canAppend(entry) which returns true if the entry can be appended to the
 * oplog, or false otherwise:
 * ```javascript
 * const CustomAccessController = ({ write } = {}) => async => {
 *   const canAppend = async (entry) => {
 *     // Use entry.identity to determine whether the entry can be appended.
 *     // Return true if entry can be appended to OpLog.
 *     // Or return false otherwise.
 *   }
 * }
 */
import IPFSAccessController from './ipfs.js'
import OrbitDBAccessController from './orbitdb.js'

/**
 * An array of available access controllers.
 * @name accessControllers
 * @†ype []
 * @return [] An array of access controllers.
 */
const accessControllers = {
  ipfs: IPFSAccessController,
  orbitdb: OrbitDBAccessController
}

/**
 * Gets an access controller module specified by type.
 * @param {string} type A valid access controller type.
 * @return {AccessController} The access controller module.
 */
const getAccessController = (type) => {
  if (!Object.keys(accessControllers).includes(type)) {
    throw new Error(`AccessController type '${type}' is not supported`)
  }
  return accessControllers[type]
}

/**
 * Adds an access controller module to the list of supported access controller.
 * @param {AccessController} accessController A compatible access controller
 * module.
 * @throws Access controller `type` already added if the access controller is
 * already supported.
 * @throws Given AccessController class needs to implement: type if the access
 * controller module does not implement a type property.
 */
const addAccessController = (accessController) => {
  if (accessControllers[accessController.type]) {
    throw new Error(`Access controller '${accessController.type}' already added.`)
  }

  if (!accessController.type) {
    throw new Error('Given AccessController class needs to implement: type.')
  }

  accessControllers[accessController.type] = accessController
}

/**
 * Removes an access controller from the list.
 * @param {string} type A valid access controller type.
 */
const removeAccessController = type => {
  delete accessControllers[type]
}

export {
  accessControllers,
  getAccessController,
  addAccessController,
  removeAccessController
}
