import Database from './database.js'
import { EventStore, KeyValue, DocumentStore } from './db/index.js'
import { Log, Entry } from './oplog/index.js'
import { ComposedStorage, IPFSBlockStorage, LevelStorage, LRUStorage } from './storage/index.js'
import KeyStore from './key-store.js'
import { Identities } from './identities/index.js'
import IPFSAccessController from './access-controllers/ipfs.js'
import OrbitDBAddress, { isValidAddress } from './address.js'
import DBManifest from './manifest.js'
import { createId, isDefined } from './utils/index.js'
// import Logger from 'logplease'
import path from 'path'
import * as Block from 'multiformats/block'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'

const codec = dagCbor
const hasher = sha256

// const logger = Logger.create('orbit-db')
// Logger.setLogLevel('ERROR')

// Mapping for 'database type' -> Class
const databaseTypes = {
  events: EventStore,
  documents: DocumentStore,
  keyvalue: KeyValue
}

// const defaultTimeout = 30000 // 30 seconds

const OpLog = { Log, Entry, IPFSBlockStorage, LevelStorage }

const OrbitDB = async ({ ipfs, id, identity, keystore, directory } = {}) => {
  if (!isDefined(ipfs)) {
    throw new Error('IPFS instance is a required argument. See https://github.com/orbitdb/orbit-db/blob/master/API.md#createinstance')
  }

  id = id || await createId()
  const { id: peerId } = await ipfs.id()
  directory = directory || './orbitdb'
  keystore = keystore || await KeyStore({ path: path.join(directory, './keystore') })
  const identities = await Identities({ ipfs, keystore })
  identity = identity || await identities.createIdentity({ id, keystore })

  const manifestStorage = await ComposedStorage(
    await LRUStorage({ size: 1000 }),
    await IPFSBlockStorage({ ipfs, pin: true })
  )

  let databases = {}

  const open = async (address, { type, meta, Store } = {}) => {
    let name, manifest, accessController

    if (databases[address]) {
      return databases[address]
    }

    if (isValidAddress(address)) {
      // If the address given was a valid OrbitDB address, eg. '/orbitdb/zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13'
      const addr = OrbitDBAddress(address)
      const bytes = await manifestStorage.get(addr.path)
      const { value } = await Block.decode({ bytes, codec, hasher })
      manifest = value
      const acAddress = manifest.accessController.replaceAll('/ipfs/', '')
      accessController = await IPFSAccessController({ ipfs, identities, identity, address: acAddress, storage: manifestStorage })
      name = manifest.name
      type = type || manifest.type
      meta = manifest.meta
    } else {
      // If the address given was not valid, eg. just the name of the database
      type = type || 'events'
      accessController = await IPFSAccessController({ ipfs, identities, identity, storage: manifestStorage })
      const m = await DBManifest(manifestStorage, address, type, accessController.address, { meta })
      manifest = m.manifest
      address = OrbitDBAddress(m.hash)
      accessController = m.accessController
      name = manifest.name
      meta = manifest.meta
    }

    const DatabaseModel = Store || databaseTypes[type]

    if (!DatabaseModel) {
      throw new Error(`Unspported database type: '${type}'`)
    }

    const db = await DatabaseModel({ OpLog, Database, ipfs, identity, address: address.toString(), name, accessController, directory, meta })

    db.events.on('close', onDatabaseClosed(address.toString()))

    databases[address.toString()] = db

    return db
  }

  const onDatabaseClosed = (address) => () => {
    delete databases[address]
  }

  const stop = async () => {
    if (keystore) {
      await keystore.close()
    }
    if (manifestStorage) {
      await manifestStorage.close()
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

export { OrbitDB as default, OrbitDBAddress }

// class OrbitDB2 {
//   constructor (ipfs, identity, options = {}) {
//     if (!isDefined(ipfs)) {
//       throw new Error('IPFS is a required argument. See https://github.com/orbitdb/orbit-db/blob/master/API.md#createinstance')
//     }
//     if (!isDefined(identity)) {
//       throw new Error('identity is a required argument. See https://github.com/orbitdb/orbit-db/blob/master/API.md#createinstance')
//     }

//     this._ipfs = ipfs
//     this.identity = identity
//     this.directory = options.directory || './orbitdb'
//     this._directConnections = {}

//     this.keystore = options.keystore
//     this.stores = {}

//     // AccessControllers module can be passed in to enable
//     // testing with orbit-db-access-controller
//     AccessControllers = options.AccessControllers || AccessControllers
//   }

//   static get KeyStore () { return KeyStore }
//   static get Identities () { return Identities }
//   static get AccessControllers () { return AccessControllers }
//   static get OrbitDBAddress () { return OrbitDBAddress }

//   static get Store () { return Store }
//   static get EventStore () { return EventStore }
//   static get FeedStore () { return FeedStore }
//   static get KeyValueStore () { return KeyValueStore }
//   static get CounterStore () { return CounterStore }
//   static get DocumentStore () { return DocumentStore }

//   static async createInstance (ipfs, options = {}) {
//     if (!isDefined(ipfs)) { throw new Error('IPFS is a required argument. See https://github.com/orbitdb/orbit-db/blob/master/API.md#createinstance') }

//     if (options.offline === undefined) {
//       options.offline = false
//     }

//     if (options.offline && !options.id) {
//       throw new Error('Offline mode requires passing an `id` in the options')
//     }

//     // TODO: don't use ipfs.id(), generate random id if one is not passed in with options
//     const { id } = options.id || options.offline ? ({ id: options.id }) : await ipfs.id()

//     if (!options.directory) { options.directory = './orbitdb' }

//     if (options.identity) {
//       // TODO: isIdentity(options.identity)
//       options.keystore = options.identity.keystore
//     }

//     if (!options.keystore) {
//       const keystorePath = path.join(options.directory, typeof id !== 'object' ? id : id.toString(), '/keystore')
//       options.keystore = new KeyStore(keystorePath)
//     }

//     if (!options.identity) {
//       options.identity = await Identities.createIdentity({
//         id,
//         keystore: options.keystore
//       })
//     }

//     const finalOptions = Object.assign({}, options, { peerId: typeof id !== 'object' ? id : id.toString() })

//     return new OrbitDB2(ipfs, options.identity, finalOptions)
//   }

//   /* Databases */
//   async feed (address, options = {}) {
//     options = Object.assign({ create: true, type: 'feed' }, options)
//     return this.open(address, options)
//   }

//   async log (address, options = {}) {
//     const accessController = {
//       canAppend: async (entry) => {
//         return true
//         // const identity = await identities1.getIdentity(entry.identity)
//         // return identity.id === testIdentity1.id
//       }
//     }
//     const db = await EventStore({ OpLog, Database, ipfs: this._ipfs, identity: this.identity, databaseId: address, accessController })
//     return db
//     // options = Object.assign({ create: true, type: 'eventlog' }, options)
//     // return this.open(address, options)
//   }

//   async eventlog (address, options = {}) {
//     return this.log(address, options)
//   }

//   async keyvalue (address, options = {}) {
//     options = Object.assign({ create: true, type: 'keyvalue' }, options)
//     return this.open(address, options)
//   }

//   async kvstore (address, options = {}) {
//     return this.keyvalue(address, options)
//   }

//   async counter (address, options = {}) {
//     options = Object.assign({ create: true, type: 'counter' }, options)
//     return this.open(address, options)
//   }

//   async docs (address, options = {}) {
//     options = Object.assign({ create: true, type: 'docstore' }, options)
//     return this.open(address, options)
//   }

//   async docstore (address, options = {}) {
//     return this.docs(address, options)
//   }

//   /*
//     options = {
//       accessController: { write: [] } // array of keys that can write to this database
//       overwrite: false, // whether we should overwrite the existing database if it exists
//     }
//   */
//   async create (name, type, options = {}) {
//     logger.debug(`Creating database '${name}' as ${type}`)

//     // Create the database address
//     const dbAddress = await this._determineAddress(name, type, options)

//     // Check if we have the database locally
//     const haveDB = await this._haveLocalData(options.cache, dbAddress)

//     if (haveDB && !options.overwrite) { throw new Error(`Database '${dbAddress}' already exists!`) }

//     // Save the database locally
//     await this._addManifestToCache(options.cache, dbAddress)

//     logger.debug(`Created database '${dbAddress}'`)

//     // Open the database
//     return this.open(dbAddress, options)
//   }

//   /*
//       options = {
//         localOnly: false // if set to true, throws an error if database can't be found locally
//         create: false // whether to create the database
//         type: TODO
//         overwrite: TODO

//       }
//    */
//   async open (address, options = {}) {
//     logger.debug('open()')

//     options = Object.assign({ localOnly: false, create: false }, options)
//     logger.debug(`Open database '${address}'`)

//     // If address is just the name of database, check the options to crate the database
//     if (!OrbitDBAddress.isValid(address)) {
//       if (!options.create) {
//         throw new Error('\'options.create\' set to \'false\'. If you want to create a database, set \'options.create\' to \'true\'.')
//       } else if (options.create && !options.type) {
//         throw new Error(`Database type not provided! Provide a type with 'options.type' (${OrbitDB.databaseTypes.join('|')})`)
//       } else {
//         logger.warn(`Not a valid OrbitDB address '${address}', creating the database`)
//         options.overwrite = options.overwrite ? options.overwrite : true
//         return this.create(address, options.type, options)
//       }
//     }

//     // Parse the database address
//     const dbAddress = OrbitDBAddress.parse(address)

//     // If database is already open, return early by returning the instance
//     // if (this.stores[dbAddress]) {
//     //   return this.stores[dbAddress]
//     // }

//     // Check if we have the database
//     const haveDB = await this._haveLocalData(options.cache, dbAddress)

//     logger.debug((haveDB ? 'Found' : 'Didn\'t find') + ` database '${dbAddress}'`)

//     // If we want to try and open the database local-only, throw an error
//     // if we don't have the database locally
//     if (options.localOnly && !haveDB) {
//       logger.warn(`Database '${dbAddress}' doesn't exist!`)
//       throw new Error(`Database '${dbAddress}' doesn't exist!`)
//     }

//     logger.debug(`Loading Manifest for '${dbAddress}'`)

//     let manifest
//     try {
//       // Get the database manifest from IPFS
//       manifest = await io.read(this._ipfs, dbAddress.root, { timeout: options.timeout || defaultTimeout })
//       logger.debug(`Manifest for '${dbAddress}':\n${JSON.stringify(manifest, null, 2)}`)
//     } catch (e) {
//       if (e.name === 'TimeoutError' && e.code === 'ERR_TIMEOUT') {
//         console.error(e)
//         throw new Error('ipfs unable to find and fetch manifest for this address.')
//       } else {
//         throw e
//       }
//     }

//     if (manifest.name !== dbAddress.path) {
//       logger.warn(`Manifest name '${manifest.name}' and path name '${dbAddress.path}' do not match`)
//     }

//     // Make sure the type from the manifest matches the type that was given as an option
//     if (options.type && manifest.type !== options.type) {
//       throw new Error(`Database '${dbAddress}' is type '${manifest.type}' but was opened as '${options.type}'`)
//     }

//     // Save the database locally
//     await this._addManifestToCache(options.cache, dbAddress)

//     // Open the the database
//     options = Object.assign({}, options, { accessControllerAddress: manifest.accessController, meta: manifest.meta })
//     return this._createStore(options.type || manifest.type, dbAddress, options)
//   }

//   /* Private methods */
//   async _createStore (type, address, options) {
//     // Get the type -> class mapping
//     const Store = databaseTypes[type]

//     if (!Store) { throw new Error(`Invalid database type '${type}'`) }

//     let accessController
//     if (options.accessControllerAddress) {
//       accessController = await AccessControllers.resolve(this, options.accessControllerAddress, options.accessController)
//     }

//     const opts = Object.assign(
//       { replicate: true },
//       options,
//       { accessController }
//     )
//     const identity = options.identity || this.identity

//     // TODO: await Database(...)
//     const store = new Store(this._ipfs, identity, address, opts)
//     // TODO: store.events.on('update', ...)
//     store.events.on('update', this._onUpdate.bind(this))
//     store.events.on('drop', this._onDrop.bind(this))
//     store.events.on('close', this._onClose.bind(this))

//     // ID of the store is the address as a string
//     const addr = address.toString()
//     this.stores[addr] = store

//     return store
//   }

//   // Callback for local writes to the database. We the update to pubsub.
//   _onUpdate (address, entry, heads) {
//     // TODO
//   }

//   // Callback for receiving a message from the network
//   async _onMessage (address, heads, peer) {
//     const store = this.stores[address]
//     try {
//       logger.debug(`Received ${heads.length} heads for '${address}':\n`, JSON.stringify(heads.map(e => e.hash), null, 2))
//       if (store && heads) {
//         if (heads.length > 0) {
//           await store.sync(heads)
//         }
//         store.events.emit('peer.exchanged', peer, address, heads)
//       }
//     } catch (e) {
//       logger.error(e)
//     }
//   }

//   // Callback for when a peer connected to a database
//   async _onPeerConnected (address, peer) {
//     logger.debug(`New peer '${peer}' connected to '${address}'`)

//     const getStore = address => this.stores[address]
//     const getDirectConnection = peer => this._directConnections[peer]
//     const onChannelCreated = channel => { this._directConnections[channel._receiverID] = channel }

//     const onMessage = (address, heads) => this._onMessage(address, heads, peer)

//     await exchangeHeads(
//       this._ipfs,
//       address,
//       peer,
//       getStore,
//       getDirectConnection,
//       onMessage,
//       onChannelCreated
//     )

//     if (getStore(address)) { getStore(address).events.emit('peer', peer) }
//   }

//   // Callback when database was closed
//   async _onClose (db) {
//     const address = db.address.toString()
//     logger.debug(`Close ${address}`)
//     delete this.stores[address]
//   }

//   async _onDrop (db) {
//   }

//   async _onLoad (db) {
//   }

//   async _determineAddress (name, type, options = {}) {
//     if (!OrbitDB.isValidType(type)) { throw new Error(`Invalid database type '${type}'`) }

//     if (OrbitDBAddress.isValid(name)) { throw new Error('Given database name is an address. Please give only the name of the database!') }

//     // Create an AccessController, use IPFS AC as the default
//     options.accessController = Object.assign({}, { name, type: 'ipfs' }, options.accessController)
//     const accessControllerAddress = await AccessControllers.create(this, options.accessController.type, options.accessController || {})

//     // Save the manifest to IPFS
//     const manifestHash = await createDBManifest(this._ipfs, name, type, accessControllerAddress, options)

//     // Create the database address
//     return OrbitDBAddress.parse(OrbitDBAddress.join(manifestHash, name))
//   }

//   async determineAddress (name, type, options = {}) {
//     const opts = Object.assign({}, { onlyHash: true }, options)
//     return this._determineAddress(name, type, opts)
//   }

//   // Save the database locally
//   async _addManifestToCache (cache, dbAddress) {
//     await cache.set(path.join(dbAddress.toString(), '_manifest'), dbAddress.root)
//     logger.debug(`Saved manifest to IPFS as '${dbAddress.root}'`)
//   }

//   /**
//    * Check if we have the database, or part of it, saved locally
//    * @param  {[Cache]} cache [The OrbitDBCache instance containing the local data]
//    * @param  {[OrbitDBAddress]} dbAddress [Address of the database to check]
//    * @return {[Boolean]} [Returns true if we have cached the db locally, false if not]
//    */
//   async _haveLocalData (cache, dbAddress) {
//     if (!cache) {
//       return false
//     }

//     const addr = dbAddress.toString()
//     const data = await cache.get(path.join(addr, '_manifest'))
//     return data !== undefined && data !== null
//   }

//   /**
//    * Shutdown OrbitDB by closing network connections, the keystore
//    * and databases opened by this OrbitDB instance.
//    */
//   async stop () {
//     // Close a direct connection and remove it from internal state
//     for (const connection of Object.values(this._directConnections)) {
//       connection.close()
//     }
//     this._directConnections = {}

//     // close keystore
//     await this.keystore.close()

//     // Close all open databases
//     for (const db of Object.values(this.stores)) {
//       await db.close()
//     }
//     this.stores = {}
//   }

//   /**
//    * Returns supported database types as an Array of strings
//    * Eg. [ 'counter', 'eventlog', 'feed', 'docstore', 'keyvalue']
//    * @return {[Array]} [Supported database types]
//    */
//   static get databaseTypes () {
//     return Object.keys(databaseTypes)
//   }

//   static isValidType (type) {
//     return Object.keys(databaseTypes).includes(type)
//   }

//   static addDatabaseType (type, store) {
//     if (databaseTypes[type]) throw new Error(`Type already exists: ${type}`)
//     databaseTypes[type] = store
//   }

//   static getDatabaseTypes () {
//     return databaseTypes
//   }

//   static isValidAddress (address) {
//     return OrbitDBAddress.isValid(address)
//   }

//   static parseAddress (address) {
//     return OrbitDBAddress.parse(address)
//   }
// }

// // OrbitDB2.prototype.AccessControllers = AccessControllers
// // OrbitDB2.prototype.Identities = Identities
// // OrbitDB2.prototype.Keystore = Keystore
