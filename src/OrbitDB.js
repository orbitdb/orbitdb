'use strict'

const path = require('path')
const EventStore = require('orbit-db-eventstore')
const FeedStore = require('orbit-db-feedstore')
const KeyValueStore = require('orbit-db-kvstore')
const CounterStore = require('orbit-db-counterstore')
const DocumentStore = require('orbit-db-docstore')
const Pubsub = require('orbit-db-pubsub')
const Cache = require('orbit-db-cache')
const Keystore = require('orbit-db-keystore')
const AccessController = require('./ipfs-access-controller')
const OrbitDBAddress = require('./orbit-db-address')
const createDBManifest = require('./db-manifest')
const exchangeHeads = require('./exchange-heads')

const Logger = require('logplease')
const logger = Logger.create("orbit-db")
Logger.setLogLevel('ERROR')

// Mapping for 'database type' -> Class
let databaseTypes = {
  'counter': CounterStore,
  'eventlog': EventStore,
  'feed': FeedStore,
  'docstore': DocumentStore,
  'keyvalue': KeyValueStore,
}

class OrbitDB {
  constructor(ipfs, directory, options = {}) {
    this._ipfs = ipfs
    this.id = options.peerId || (this._ipfs._peerInfo ? this._ipfs._peerInfo.id._idB58String : 'default')
    this._pubsub = options && options.broker
      ? new options.broker(this._ipfs)
      : new Pubsub(this._ipfs, this.id)
    this.stores = {}
    this.directory = directory || './orbitdb'
    this.keystore = options.keystore || Keystore.create(path.join(this.directory, this.id, '/keystore'))
    this.key = this.keystore.getKey(this.id) || this.keystore.createKey(this.id)
    this._directConnections = {}
  }

  /* Databases */
  async feed (address, options = {}) {
    options = Object.assign({ create: true, type: 'feed' }, options)
    return this.open(address, options)
  }

  async log (address, options) {
    options = Object.assign({ create: true, type: 'eventlog' }, options)
    return this.open(address, options)
  }

  async eventlog (address, options = {}) {
    return this.log(address, options)
  }

  async keyvalue (address, options) {
    options = Object.assign({ create: true, type: 'keyvalue' }, options)
    return this.open(address, options)
  }

  async kvstore (address, options) {
    return this.keyvalue(address, options)
  }

  async counter (address, options = {}) {
    options = Object.assign({ create: true, type: 'counter' }, options)
    return this.open(address, options)
  }

  async docs (address, options = {}) {
    options = Object.assign({ create: true, type: 'docstore' }, options)
    return this.open(address, options)
  }

  async docstore (address, options = {}) {
    return this.docs(address, options)
  }

  async disconnect () {
    // Close all open databases
    const databases = Object.values(this.stores)
    for (let db of databases) {
      await db.close()
      delete this.stores[db.address.toString()]
    }

    // Close a direct connection and remove it from internal state
    const removeDirectConnect = e => {
      this._directConnections[e].close()
      delete this._directConnections[e]
    }

    // Close all direct connections to peers
    Object.keys(this._directConnections).forEach(removeDirectConnect)

    // Disconnect from pubsub
    if (this._pubsub)
      this._pubsub.disconnect()

    // Remove all databases from the state
    this.stores = {}
  }

  // Alias for disconnect()
  async stop () {
    await this.disconnect()
  }

  /* Private methods */
  async _createStore (type, address, options) {
    // Get the type -> class mapping
    const Store = databaseTypes[type]

    if (!Store)
      throw new Error(`Invalid database type '${type}'`)

    let accessController
    if (options.accessControllerAddress) {
      accessController = new AccessController(this._ipfs)
      await accessController.load(options.accessControllerAddress)
    }

    const cache = await this._loadCache(this.directory, address)

    const opts = Object.assign({ replicate: true }, options, {
      accessController: accessController,
      keystore: this.keystore,
      cache: cache,
      onClose: this._onClose.bind(this),
    })

    const store = new Store(this._ipfs, this.id, address, opts)
    store.events.on('write', this._onWrite.bind(this))

    // ID of the store is the address as a string
    const addr = address.toString()
    this.stores[addr] = store

    // Subscribe to pubsub to get updates from peers,
    // this is what hooks us into the message propagation layer
    // and the p2p network
    if(opts.replicate && this._pubsub)
      this._pubsub.subscribe(addr, this._onMessage.bind(this), this._onPeerConnected.bind(this))

    return store
  }

  // Callback for local writes to the database. We the update to pubsub.
  _onWrite (address, entry, heads) {
    if(!heads) throw new Error("'heads' not defined")
    if(this._pubsub) this._pubsub.publish(address, heads)
  }

  // Callback for receiving a message from the network
  async _onMessage (address, heads) {
    const store = this.stores[address]
    try {
      logger.debug(`Received ${heads.length} heads for '${address}':\n`, JSON.stringify(heads.map(e => e.hash), null, 2))
      if (store && heads && heads.length > 0) {
        await store.sync(heads)
      }
    } catch (e) {
      logger.error(e)
    }
  }

  // Callback for when a peer connected to a database
  async _onPeerConnected (address, peer) {
    logger.debug(`New peer '${peer}' connected to '${address}'`)

    const getStore = address => this.stores[address]
    const getDirectConnection = peer => this._directConnections[peer]
    const onChannelCreated = channel => this._directConnections[channel._receiverID] = channel
    const onMessage = (address, heads) => this._onMessage(address, heads)

    const channel = await exchangeHeads(
      this._ipfs,
      address,
      peer,
      getStore,
      getDirectConnection,
      onMessage,
      onChannelCreated
    )

    if (getStore(address))
      getStore(address).events.emit('peer', peer)
  }

  // Callback when database was closed
  _onClose (address) {
    logger.debug(`Close ${address}`)

    // Unsubscribe from pubsub
    if(this._pubsub)
      this._pubsub.unsubscribe(address)

    delete this.stores[address]
  }

  /* Create and Open databases */

  /*
    options = {
      admin: [], // array of keys that are the admins of this database (same as write access)
      write: [], // array of keys that can write to this database
      directory: './orbitdb', // directory in which to place the database files
      overwrite: false, // whether we should overwrite the existing database if it exists
    }
  */
  async create (name, type, options = {}) {
    logger.debug(`create()`)

    if (!OrbitDB.isValidType(type))
      throw new Error(`Invalid database type '${type}'`)

    // The directory to look databases from can be passed in as an option
    const directory = options.directory || this.directory
    logger.debug(`Creating database '${name}' as ${type} in '${directory}'`)

    if (OrbitDBAddress.isValid(name))
      throw new Error(`Given database name is an address. Please give only the name of the database!`)

    // Create an AccessController
    const accessController = new AccessController(this._ipfs)
    /* Disabled temporarily until we do something with the admin keys */
    // Add admins of the database to the access controller
    // if (options && options.admin) {
    //   options.admin.forEach(e => accessController.add('admin', e))
    // } else {
    //   // Default is to add ourselves as the admin of the database
    //   accessController.add('admin', this.key.getPublic('hex'))
    // }
    // Add keys that can write to the database
    if (options && options.write && options.write.length > 0) {
      options.write.forEach(e => accessController.add('write', e))
    } else {
      // Default is to add ourselves as the admin of the database
      accessController.add('write', this.key.getPublic('hex'))
    }
    // Save the Access Controller in IPFS
    const accessControllerAddress = await accessController.save()

    // Save the manifest to IPFS
    const manifestHash = await createDBManifest(this._ipfs, name, type, accessControllerAddress)

    // Create the database address
    const dbAddress = OrbitDBAddress.parse(path.join('/orbitdb', manifestHash, name))

    // // Load local cache
    const haveDB = await this._loadCache(directory, dbAddress)
      .then(cache => cache ? cache.get(path.join(dbAddress.toString(), '_manifest')) : null)
      .then(data => data !== undefined && data !== null)

    if (haveDB && !options.overwrite)
      throw new Error(`Database '${dbAddress}' already exists!`)

    // Save the database locally
    await this._saveDBManifest(directory, dbAddress)

    logger.debug(`Created database '${dbAddress}'`)

    // Open the database
    return this.open(dbAddress, options)
  }

  /*
      options = {
        localOnly: false // if set to true, throws an error if database can't be found locally
        create: false // wether to create the database
        type: TODO
        overwrite: TODO

      }
   */
  async open (address, options = {}) {
    logger.debug(`open()`)
    options = Object.assign({ localOnly: false, create: false }, options)
    logger.debug(`Open database '${address}'`)

    // The directory to look databases from can be passed in as an option
    const directory = options.directory || this.directory
    logger.debug(`Look from '${directory}'`)

    // If address is just the name of database, check the options to crate the database
    if (!OrbitDBAddress.isValid(address)) {
      if (!options.create) {
        throw new Error(`'options.create' set to 'false'. If you want to create a database, set 'options.create' to 'true'.`)
      } else if (options.create && !options.type) {
        throw new Error(`Database type not provided! Provide a type with 'options.type' (${OrbitDB.databaseTypes.join('|')})`)
      } else {
        logger.warn(`Not a valid OrbitDB address '${address}', creating the database`)
        options.overwrite = options.overwrite ? options.overwrite : true
        return this.create(address, options.type, options)
      }
    }

    // Parse the database address
    const dbAddress = OrbitDBAddress.parse(address)

    // Check if we have the database
    const haveDB = await this._loadCache(directory, dbAddress)
      .then(cache => cache ? cache.get(path.join(dbAddress.toString(), '_manifest')) : null)
      .then(data => data !== undefined && data !== null)

    logger.debug((haveDB ? 'Found' : 'Didn\'t find') + ` database '${dbAddress}'`)

    // If we want to try and open the database local-only, throw an error
    // if we don't have the database locally
    if (options.localOnly && !haveDB) {
      logger.warn(`Database '${dbAddress}' doesn't exist!`)
      throw new Error(`Database '${dbAddress}' doesn't exist!`)
    }

    logger.debug(`Loading Manifest for '${dbAddress}'`)

    // Get the database manifest from IPFS
    const dag = await this._ipfs.object.get(dbAddress.root)
    const manifest = JSON.parse(dag.toJSON().data)
    logger.debug(`Manifest for '${dbAddress}':\n${JSON.stringify(manifest, null, 2)}`)

    // Make sure the type from the manifest matches the type that was given as an option
    if (options.type && manifest.type !== options.type)
      throw new Error(`Database '${dbAddress}' is type '${manifest.type}' but was opened as '${options.type}'`)

    // Save the database locally
    await this._saveDBManifest(directory, dbAddress)

    // Open the the database
    options = Object.assign({}, options, { accessControllerAddress: manifest.accessController })
    return this._createStore(manifest.type, dbAddress, options)
  }

  // Save the database locally
  async _saveDBManifest (directory, dbAddress) {
    const cache = await this._loadCache(directory, dbAddress)
    await cache.set(path.join(dbAddress.toString(), '_manifest'), dbAddress.root)
    logger.debug(`Saved manifest to IPFS as '${dbAddress.root}'`)
  }

  async _loadCache (directory, dbAddress) {
    let cache
    try {
      cache = await Cache.load(directory, dbAddress)
    } catch (e) {
      console.log(e)
      logger.error("Couldn't load Cache:", e)
    }

    return cache
  }

  /**
   * Returns supported database types as an Array of strings
   * Eg. [ 'counter', 'eventlog', 'feed', 'docstore', 'keyvalue']
   * @return {[Array]} [Supported database types]
   */
  static get databaseTypes () {
    return Object.keys(databaseTypes)
  }

  static isValidType (type) {
    return Object.keys(databaseTypes).includes(type)
  }

  static addDatabaseType (type, store) {
    if (databaseTypes[type]) throw new Error(`Type already exists: ${type}`)
    databaseTypes[type] = store
  }

  static getDatabaseTypes () {
    return databaseTypes
  }

  static isValidAddress (address) {
    return OrbitDBAddress.isValid(address)
  }

  static parseAddress (address) {
    return OrbitDBAddress.parse(address)
  }
}

module.exports = OrbitDB
