/**
 * @namespace AccessControllers-OrbitDB
 * @memberof module:AccessControllers
 */
import ensureACAddress from '../utils/ensure-ac-address.js'
import IPFSAccessController from './ipfs.js'

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
 */

/**
 * Defines an OrbitDB access controller.
 * @param {Object} options Various options for configuring the
 * IPFSAccessController.
 * @param {Array} [params.write] An array of identity ids who can write to the
 * database.
 * @return {module:AccessControllers.AccessControllers-OrbitDB} An
 * IPFSAccessController function.
 * @memberof module:AccessControllers
 */
const OrbitDBAccessController = ({ write } = {}) => async ({ orbitdb, identities, address }) => {
  address = address || 'default-access-controller'
  write = write || [orbitdb.identity.id]

  // Force '<address>/_access' naming for the database
  const db = await orbitdb.open(ensureACAddress(address), { type: 'keyvalue', AccessController: IPFSAccessController({ write }) })
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
   * @return {Array} A list of addresses with admin and write access.
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
      ...{ admin: new Set([...(_capabilities.admin || []), ...write]) }
    }).forEach(toSet)

    return _capabilities
  }

  /**
   * Gets a list of addresses with the specified capability.
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
   * Checks whether an address has a capability.
   * @param {string} capability A capability (e.g. write).
   * @param {string} key An address.
   * @return {boolean} True if the address has the capability, false
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
   * Grants a capability to an address, storing it to the access control
   * database.
   * @param {string} capability A capability (e.g. write).
   * @param {string} key An address.
   * @memberof module:AccessControllers.AccessControllers-OrbitDB
   * @instance
   */
  const grant = async (capability, key) => {
    // Merge current keys with the new key
    const capabilities = new Set([...(await db.get(capability) || []), ...[key]])
    await db.put(capability, Array.from(capabilities.values()))
  }

  /**
   * Revokes a capability from an address, removing it from the access control
   * database.
   * @param {string} capability A capability (e.g. write).
   * @param {string} key An address.
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
    events: db.events
  }
}

export default OrbitDBAccessController
