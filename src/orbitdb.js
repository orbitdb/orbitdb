/** @module OrbitDB */
import { Events, KeyValue, Documents } from './db/index.js'
import KeyStore from './key-store.js'
import { Identities } from './identities/index.js'
import OrbitDBAddress, { isValidAddress } from './address.js'
import Manifests from './manifest.js'
import { createId } from './utils/index.js'
import pathJoin from './utils/path-join.js'
import * as AccessControllers from './access-controllers/index.js'
import IPFSAccessController from './access-controllers/ipfs.js'

// Mapping for database types
const databaseTypes = {
  events: Events,
  documents: Documents,
  keyvalue: KeyValue
}

const addDatabaseType = (type, store) => {
  if (databaseTypes[type]) {
    throw new Error(`Type already exists: ${type}`)
  }
  databaseTypes[type] = store
}

const DefaultDatabaseType = 'events'
const DefaultAccessController = IPFSAccessController

const OrbitDB = async ({ ipfs, id, identity, keystore, directory } = {}) => {
  if (ipfs == null) {
    throw new Error('IPFS instance is a required argument. See https://github.com/orbitdb/orbit-db/blob/master/API.md#createinstance')
  }

  id = id || await createId()
  const { id: peerId } = await ipfs.id()
  directory = directory || './orbitdb'
  keystore = keystore || await KeyStore({ path: pathJoin(directory, './keystore') })
  const identities = await Identities({ ipfs, keystore })
  identity = identity || await identities.createIdentity({ id })

  const manifests = await Manifests({ ipfs })

  let databases = {}

  const open = async (address, { type, meta, sync, Database, AccessController, headsStorage, entryStorage, indexStorage, referencesCount } = {}) => {
    let name, manifest, accessController

    if (type && !databaseTypes[type]) {
      throw new Error(`Unsupported database type: '${type}'`)
    }

    if (databases[address]) {
      return databases[address]
    }

    if (isValidAddress(address)) {
      // If the address given was a valid OrbitDB address, eg. '/orbitdb/zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13'
      const addr = OrbitDBAddress(address)
      manifest = await manifests.get(addr.path)
      const acType = manifest.accessController.split('/', 2).pop()
      const acAddress = manifest.accessController.replaceAll(`/${acType}/`, '')
      AccessController = AccessControllers.get(acType)()
      accessController = await AccessController({ orbitdb: { open, identity, ipfs }, identities, address: acAddress })
      name = manifest.name
      type = type || manifest.type
      meta = manifest.meta
    } else {
      // If the address given was not valid, eg. just the name of the database
      type = type || DefaultDatabaseType
      AccessController = AccessController || DefaultAccessController()
      accessController = await AccessController({ orbitdb: { open, identity, ipfs }, identities })
      const m = await manifests.create({ name: address, type, accessController: accessController.address, meta })
      manifest = m.manifest
      address = OrbitDBAddress(m.hash)
      name = manifest.name
      meta = manifest.meta
    }

    Database = Database || databaseTypes[type]()

    if (!Database) {
      throw new Error(`Unsupported database type: '${type}'`)
    }

    address = address.toString()

    const db = await Database({ ipfs, identity, address, name, access: accessController, directory, meta, syncAutomatically: sync, headsStorage, entryStorage, indexStorage, referencesCount })

    db.events.on('close', onDatabaseClosed(address))

    databases[address] = db

    return db
  }

  const onDatabaseClosed = (address) => () => {
    delete databases[address]
  }

  const stop = async () => {
    if (keystore) {
      await keystore.close()
    }
    if (manifests) {
      await manifests.close()
    }
    databases = {}
  }

  return {
    open,
    stop,
    ipfs,
    directory,
    keystore,
    identity,
    peerId
  }
}

export { OrbitDB as default, OrbitDBAddress, addDatabaseType, databaseTypes, AccessControllers }
