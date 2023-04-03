import { EventEmitter } from 'events'
import ensureACAddress from '../utils/ensure-ac-address.js'
import IPFSAccessController from './ipfs.js'

const type = 'orbitdb'

const OrbitDBAccessController = ({ write } = {}) => async ({ orbitdb, identities, address }) => {
  const events = new EventEmitter()

  address = address || 'default-access-controller'
  write = write || [orbitdb.identity.id]

  // Force '<address>/_access' naming for the database
  const db = await orbitdb.open(ensureACAddress(address), { type: 'keyvalue', AccessController: IPFSAccessController({ write }) })
  address = db.address

  const onUpdate = (entry) => {
    events.emit('update', entry)
  }

  db.events.on('update', onUpdate)

  // Return true if entry is allowed to be added to the database
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

  const get = async (capability) => {
    const _capabilities = await capabilities()
    return _capabilities[capability] || new Set([])
  }

  const close = async () => {
    await db.close()
  }

  const hasCapability = async (capability, key) => {
    // Write keys and admins keys are allowed
    const access = new Set(await get(capability))
    return access.has(key) || access.has('*')
  }

  const grant = async (capability, key) => {
    // Merge current keys with the new key
    const capabilities = new Set([...(await db.get(capability) || []), ...[key]])
    await db.put(capability, Array.from(capabilities.values()))
  }

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
    events
  }
}

export default OrbitDBAccessController
