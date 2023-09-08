/**
 * @namespace AccessControllers-OrbitDB
 * @memberof module:AccessControllers
 */
import IPFSAccessController from './ipfs.js'
import { createId } from '../utils/index.js'

const type = 'orbitdb'

/**
 * Creates an instance of OrbitDBAccessController.
 * @callback OrbitDBAccessController
 * @param {Object} params Various parameters for configuring the access
 * controller.
 * @param {module:OrbitDB} params.orbitdb An OrbitDB instance.
 * @param {module:Identities} params.identities An Identities instance.
 * @param {string} [params.address] The address of the database.
 * @function
 * @instance
 * @async
 * @memberof module:AccessControllers.AccessControllers-OrbitDB
 * @private
 */

/**
 * Defines an OrbitDB access controller.
 * @param {Object} options Various options for configuring the
 * IPFSAccessController.
 * @param {Array} [params.write] An array of ids of identities who can write to the
 * database.
 * @return {module:AccessControllers.AccessControllers-OrbitDB} An
 * IPFSAccessController function.
 * @memberof module:AccessControllers
 */
const OrbitDBAccessController = ({ write } = {}) => async ({ orbitdb, identities, address, name }) => {
  address = address || name || await createId(64)
  write = write || [orbitdb.identity.id]

  // Open the database used for access information
  const db = await orbitdb.open(address, { type: 'keyvalue', AccessController: IPFSAccessController({ write }) })
  address = db.address

  /**
   * Verifies the write permission of an entry.
   * @param {module:Log~Entry} entry An entry to verify.
   * @return {boolean} True if the entry's identity has write permission,
   * false otherwise.
   * @memberof module:AccessControllers.AccessControllers-OrbitDB
   * @instance
   */
  const canAppend = async (entry) => {
    const writerIdentity = await identities.getIdentity(entry.identity)
    if (!writerIdentity) {
      return false
    }

    const { id } = writerIdentity
    // If the ACL contains the writer's public key or it contains '*'
    const hasWriteAccess = await hasCapability('write', id) || await hasCapability('admin', id)
    if (hasWriteAccess) {
      return identities.verifyIdentity(writerIdentity)
    }

    return false
  }

  /**
   * Gets the access capabilities of the OrbitDB access controller.
   *
   * The returned capabilities will be a mixture of admin and write access
   * addresses.
   * @return {Array} A list of ids of identities with admin and write access.
   * @memberof module:AccessControllers.AccessControllers-OrbitDB
   * @instance
   */
  const capabilities = async () => {
    const _capabilities = []
    for await (const entry of db.iterator()) {
      _capabilities[entry.key] = entry.value
    }

    const toSet = (e) => {
      const key = e[0]
      _capabilities[key] = new Set([...(_capabilities[key] || []), ...e[1]])
    }

    // Merge with the access controller of the database
    // and make sure all values are Sets
    Object.entries({
      ..._capabilities,
      // Add the root access controller's 'write' access list
      // as admins on this controller
      ...{ admin: new Set([...(_capabilities.admin || []), ...db.access.write]) }
    }).forEach(toSet)

    return _capabilities
  }

  /**
   * Gets a list of identities with the specified capability.
   * @param {string} capability A capability (e.g. write).
   * @return {Array} One or more addresses with the spcified capability.
   * @memberof module:AccessControllers.AccessControllers-OrbitDB
   * @instance
   */
  const get = async (capability) => {
    const _capabilities = await capabilities()
    return _capabilities[capability] || new Set([])
  }

  /**
   * Close the underlying access control database.
   * @memberof module:AccessControllers.AccessControllers-OrbitDB
   * @instance
   */
  const close = async () => {
    await db.close()
  }

  /**
   * Drop the underlying access control database.
   * @memberof module:AccessControllers.AccessControllers-OrbitDB
   * @instance
   */
  const drop = async () => {
    await db.drop()
  }

  /**
   * Checks whether an identity has a capability.
   * @param {string} capability A capability (e.g. write).
   * @param {string} key An id of an identity.
   * @return {boolean} True if the identity has the capability, false
   * otherwise.
   * @memberof module:AccessControllers.AccessControllers-OrbitDB
   * @instance
   */
  const hasCapability = async (capability, key) => {
    // Write keys and admins keys are allowed
    const access = new Set(await get(capability))
    return access.has(key) || access.has('*')
  }

  /**
   * Grants a capability to an identity, storing it to the access control
   * database.
   * @param {string} capability A capability (e.g. write).
   * @param {string} key An id of an identity.
   * @memberof module:AccessControllers.AccessControllers-OrbitDB
   * @instance
   */
  const grant = async (capability, key) => {
    // Merge current keys with the new key
    const capabilities = new Set([...(await db.get(capability) || []), ...[key]])
    await db.put(capability, Array.from(capabilities.values()))
  }

  /**
   * Revokes a capability from an identity, removing it from the access control
   * database.
   * @param {string} capability A capability (e.g. write).
   * @param {string} key An id of an identity.
   * @memberof module:AccessControllers.AccessControllers-OrbitDB
   * @instance
   */
  const revoke = async (capability, key) => {
    const capabilities = new Set(await db.get(capability) || [])
    capabilities.delete(key)
    if (capabilities.size > 0) {
      await db.put(capability, Array.from(capabilities.values()))
    } else {
      await db.del(capability)
    }
  }

  return {
    type,
    address,
    write,
    canAppend,
    capabilities,
    get,
    grant,
    revoke,
    close,
    drop,
    events: db.events
  }
}

OrbitDBAccessController.type = type

export default OrbitDBAccessController
