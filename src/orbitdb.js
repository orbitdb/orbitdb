/**
* @module OrbitDB
* @description Provides an interface for users to interact with OrbitDB.
*/
import { getDatabaseType } from './databases/index.js'
import KeyStore from './key-store.js'
import { Identities } from './identities/index.js'
import OrbitDBAddress, { isValidAddress } from './address.js'
import ManifestStore from './manifest-store.js'
import { createId } from './utils/index.js'
import pathJoin from './utils/path-join.js'
import { getAccessController } from './access-controllers/index.js'
import IPFSAccessController from './access-controllers/ipfs.js'

const DefaultDatabaseType = 'events'

const DefaultAccessController = IPFSAccessController

/**
 * Creates an instance of OrbitDB.
 * @function createOrbitDB
 * @param {Object} params One or more parameters for configuring OrbitDB.
 * @param {IPFS} params.ipfs An IPFS instance.
 * @param {string} [params.id] The id of the identity to use for this OrbitDB instance.
 * @param {module:Identity|Object} [params.identity] An identity instance or an object containing an Identity Provider instance and any additional params required to create the identity using the specified provider.
 * @param {Function} [params.identity.provider] An initialized identity provider.
 * @param {module:Identities} [params.identities] An Identities system instance.
 * @param {string} [params.directory] A location for storing OrbitDB data.
 * @return {module:OrbitDB~OrbitDB} An instance of OrbitDB.
 * @throws "IPFS instance is required argument" if no IPFS instance is provided.
 * @instance
 */
const OrbitDB = async ({ ipfs, id, identity, identities, directory } = {}) => {
  /**
   * @namespace module:OrbitDB~OrbitDB
   * @description The instance returned by {@link module:OrbitDB}.
   */

  if (ipfs == null) {
    throw new Error('IPFS instance is a required argument.')
  }

  id = id || await createId()
  const { id: peerId } = await ipfs.id()
  directory = directory || './orbitdb'

  let keystore

  if (identities) {
    keystore = identities.keystore
  } else {
    keystore = await KeyStore({ path: pathJoin(directory, './keystore') })
    identities = await Identities({ ipfs, keystore })
  }

  if (identity) {
    if (identity.provider) {
      identity = await identities.createIdentity({ ...identity })
    }
  } else {
    identity = await identities.createIdentity({ id })
  }

  const manifestStore = await ManifestStore({ ipfs })

  let databases = {}

  /**
   * Open a database or create one if it does not already exist.
   *
   * By default, OrbitDB will create a database of type [DefaultDatabaseType]{@link module:OrbitDB~DefaultDatabaseType}:
   * ```
   * const mydb = await orbitdb.open('mydb')
   * ```
   * To create a database of a different type, specify the type param:
   * ```
   * const mydb = await orbitdb.open('mydb', {type: 'documents'})
   * ```
   * The type must be listed in [databaseTypes]{@link module:OrbitDB.databaseTypes} or an error is thrown.
   * To open an existing database, pass its address to the `open` function:
   * ```
   * const existingDB = await orbitdb.open(dbAddress)
   * ```
   * The address of a newly created database can be retrieved using
   * `db.address`.
   * @function
   * @param {string} address The address of an existing database to open, or
   * the name of a new database.
   * @param {Object} params One or more database configuration parameters.
   * @param {string} [params.type=events] The database's type.
   * @param {*} [params.meta={}] The database's metadata. Only applies when
   * creating a database and is not used when opening an existing database.
   * @param {boolean} [params.sync=true] If true, sync databases automatically.
   * Otherwise, false.
   * @param {module:Database} [params.Database=[Events]{@link module:Database.Database-Events}] A Database-compatible
   * module.
   * @param {module:AccessControllers}
   * [params.AccessController=[IPFSAccessController]{@link module:AccessControllers.AccessControllers-IPFS}]
   * An AccessController-compatible module.
   * @param {module:Storage} [params.headsStorage=[ComposedStorage]{@link module:Storage.Storage-Composed}] A compatible storage instance for storing
   * log heads. Defaults to ComposedStorage(LRUStorage, LevelStorage).
   * @param {module:Storage} [params.entryStorage=[ComposedStorage]{@link module:Storage.Storage-Composed}] A compatible storage instance for storing
   * log entries. Defaults to ComposedStorage(LRUStorage, IPFSBlockStorage).
   * @param {module:Storage} [params.indexStorage=[ComposedStorage]{@link module:Storage.Storage-Composed}] A compatible storage instance for storing an " index of log entries. Defaults to ComposedStorage(LRUStorage, LevelStorage).
   * @param {number} [params.referencesCount] The number of references to
   * use for [Log]{@link module:Log} entries.
   * @memberof module:OrbitDB
   * @return {module:Database} A database instance.
   * @throws "Unsupported database type" if the type specified is not in the list
   * of known databaseTypes.
   * @memberof module:OrbitDB~OrbitDB
   * @instance
   * @async
   */
  const open = async (address, { type, meta, sync, Database, AccessController, headsStorage, entryStorage, indexStorage, referencesCount } = {}) => {
    let name, manifest, accessController

    if (databases[address]) {
      return databases[address]
    }

    if (isValidAddress(address)) {
      // If the address given was a valid OrbitDB address, eg. '/orbitdb/zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13'
      const addr = OrbitDBAddress(address)
      manifest = await manifestStore.get(addr.hash)
      const acType = manifest.accessController.split('/', 2).pop()
      AccessController = getAccessController(acType)()
      accessController = await AccessController({ orbitdb: { open, identity, ipfs }, identities, address: manifest.accessController })
      name = manifest.name
      type = type || manifest.type
      meta = manifest.meta
    } else {
      // If the address given was not valid, eg. just the name of the database
      type = type || DefaultDatabaseType
      AccessController = AccessController || DefaultAccessController()
      accessController = await AccessController({ orbitdb: { open, identity, ipfs }, identities, name: address })
      const m = await manifestStore.create({ name: address, type, accessController: accessController.address, meta })
      manifest = m.manifest
      address = OrbitDBAddress(m.hash)
      name = manifest.name
      meta = manifest.meta
      // Check if we already have the database open and return if it is
      if (databases[address]) {
        return databases[address]
      }
    }

    Database = Database || getDatabaseType(type)()

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

  /**
   * Stops OrbitDB, closing the underlying keystore and manifest store.
   * @function stop
   * @memberof module:OrbitDB~OrbitDB
   * @instance
   * @async
   */
  const stop = async () => {
    for (const db of Object.values(databases)) {
      await db.close()
    }
    if (keystore) {
      await keystore.close()
    }
    if (manifestStore) {
      await manifestStore.close()
    }
    databases = {}
  }

  return {
    id,
    open,
    stop,
    ipfs,
    directory,
    keystore,
    identity,
    peerId
  }
}

export { OrbitDB as default, OrbitDBAddress }
