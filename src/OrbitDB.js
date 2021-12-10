'use strict'

const path = require('path')
const Store = require('orbit-db-store')
const EventStore = require('orbit-db-eventstore')
const FeedStore = require('orbit-db-feedstore')
const KeyValueStore = require('orbit-db-kvstore')
const CounterStore = require('orbit-db-counterstore')
const DocumentStore = require('orbit-db-docstore')
const Pubsub = require('orbit-db-pubsub')
const Cache = require('orbit-db-cache')
const Keystore = require('orbit-db-keystore')
const Identities = require('orbit-db-identity-provider')
let AccessControllers = require('orbit-db-access-controllers')
const Address = require('./address')
const Manifest = require('./manifest')
const exchangeHeads = require('./exchange-heads')
const { isDefined } = require('./utils')
const Storage = require('orbit-db-storage-adapter')
const migrations = require('./migrations')

const Logger = require('logplease')
const logger = Logger.create('orbit-db')
Logger.setLogLevel('ERROR')

// Mapping for 'database type' -> Class
const databaseTypes = {
  counter: CounterStore,
  eventlog: EventStore,
  feed: FeedStore,
  docstore: DocumentStore,
  keyvalue: KeyValueStore
}

const defaultTimeout = 30000 // 30 seconds

class OrbitDB {
  constructor (ipfs, identity, options = {}) {
    if (!isDefined(ipfs)) { throw new Error('IPFS is a required argument. See https://github.com/orbitdb/orbit-db/blob/master/API.md#createinstance') }

    if (!isDefined(identity)) { throw new Error('identity is a required argument. See https://github.com/orbitdb/orbit-db/blob/master/API.md#createinstance') }

    this._ipfs = ipfs
    this.identity = identity
    this.id = options.peerId
    this._pubsub = !options.offline
      ? new (
        options.broker ? options.broker : Pubsub
      )(this._ipfs, this.id)
      : null
    this.directory = options.directory || './orbitdb'
    this.storage = options.storage
    this._directConnections = {}

    this.caches = {}
    this.caches[this.directory] = { cache: options.cache, handlers: new Set() }
    this.keystore = options.keystore
    this.stores = {}

    // AccessControllers module can be passed in to enable
    // testing with orbit-db-access-controller
    AccessControllers = options.AccessControllers || AccessControllers
  }

  static get Pubsub () { return Pubsub }
  static get Cache () { return Cache }
  static get Keystore () { return Keystore }
  static get Identities () { return Identities }
  static get AccessControllers () { return AccessControllers }
  static get Storage () { return Storage }
  // static get OrbitDBAddress () { return Address }

  static get Store () { return Store }
  static get EventStore () { return EventStore }
  static get FeedStore () { return FeedStore }
  static get KeyValueStore () { return KeyValueStore }
  static get CounterStore () { return CounterStore }
  static get DocumentStore () { return DocumentStore }

  get cache () { return this.caches[this.directory].cache }

  static async createInstance (ipfs, options = {}) {
    if (!isDefined(ipfs)) { throw new Error('IPFS is a required argument. See https://github.com/orbitdb/orbit-db/blob/master/API.md#createinstance') }

    if (options.offline === undefined) {
      options.offline = false
    }

    if (options.offline && !options.id) {
      throw new Error('Offline mode requires passing an `id` in the options')
    }

    const { id } = options.id || options.offline ? ({ id: options.id }) : await ipfs.id()

    if (!options.directory) { options.directory = './orbitdb' }

    if (!options.storage) {
      const storageOptions = {}

      // Create default `level` store
      options.storage = Storage(null, storageOptions)
    }

    if (options.identity && options.identity.provider.keystore) {
      options.keystore = options.identity.provider.keystore
    }

    if (!options.keystore) {
      const keystorePath = path.join(options.directory, id, '/keystore')
      const keyStorage = await options.storage.createStore(keystorePath)
      options.keystore = new Keystore(keyStorage)
    }

    if (!options.identity) {
      options.identity = await Identities.createIdentity({
        id: id,
        keystore: options.keystore
      })
    }

    if (!options.cache) {
      const cachePath = path.join(options.directory, id, '/cache')
      const cacheStorage = await options.storage.createStore(cachePath)
      options.cache = new Cache(cacheStorage)
    }

    const finalOptions = Object.assign({}, options, { peerId: id })
    return new OrbitDB(ipfs, options.identity, finalOptions)
  }

  async disconnect () {
    // Close a direct connection and remove it from internal state
    const removeDirectConnect = e => {
      this._directConnections[e].close()
      delete this._directConnections[e]
    }

    // Close all direct connections to peers
    Object.keys(this._directConnections).forEach(removeDirectConnect)

    // Disconnect from pubsub
    if (this._pubsub) {
      await this._pubsub.disconnect()
    }

    // close keystore
    await this.keystore.close()

    // Close all open databases
    const databases = Object.values(this.stores)
    for (const db of databases) {
      await db.close()
      delete this.stores[db.address.toString()]
    }

    const caches = Object.keys(this.caches)
    for (const directory of caches) {
      await this.caches[directory].cache.close()
      delete this.caches[directory]
    }

    // Remove all databases from the state
    this.stores = {}
  }

  // Alias for disconnect()
  async stop () {
    await this.disconnect()
  }

  async _createCache (path) {
    const cacheStorage = await this.storage.createStore(path)
    return new Cache(cacheStorage)
  }

  /* Private methods */
  async _createStore (manifest, options) {
    const { type, address } = manifest
    // Get the type -> class mapping
    const Store = databaseTypes[type]

    if (!Store) { throw new Error(`Invalid database type '${type}'`) }

    let accessController
    if (options.accessControllerAddress) {
      accessController = await AccessControllers.resolve(this, options.accessControllerAddress, options.accessController)
    }

    const opts = Object.assign({ replicate: true }, options, {
      accessController: accessController,
      cache: options.cache,
      onClose: this._onClose.bind(this),
      onDrop: this._onDrop.bind(this),
      onLoad: this._onLoad.bind(this)
    })
    const identity = options.identity || this.identity

    const store = new Store(this._ipfs, identity, address, opts)
    store.events.on('write', this._onWrite.bind(this))

    // ID of the store is the address as a string
    this.stores[address] = store

    // Subscribe to pubsub to get updates from peers,
    // this is what hooks us into the message propagation layer
    // and the p2p network
    if (opts.replicate && this._pubsub) {
      await this._pubsub.subscribe(address.toString(), this._onMessage.bind(this), this._onPeerConnected.bind(this))
    }

    return store
  }

  // Callback for local writes to the database. We the update to pubsub.
  _onWrite (address, entry, heads) {
    if (!heads) throw new Error("'heads' not defined")
    if (this._pubsub) this._pubsub.publish(address, heads)
  }

  // Callback for receiving a message from the network
  async _onMessage (address, heads, peer) {
    const store = this.stores[address]
    try {
      logger.debug(`Received ${heads.length} heads for '${address}':\n`, JSON.stringify(heads.map(e => e.hash), null, 2))
      if (store && heads) {
        if (heads.length > 0) {
          await store.sync(heads)
        }
        store.events.emit('peer.exchanged', peer, address, heads)
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
    const onChannelCreated = channel => { this._directConnections[channel._receiverID] = channel }

    const onMessage = (address, heads) => this._onMessage(address, heads, peer)

    await exchangeHeads(
      this._ipfs,
      address,
      peer,
      getStore,
      getDirectConnection,
      onMessage,
      onChannelCreated
    )

    if (getStore(address)) { getStore(address).events.emit('peer', peer) }
  }

  // Callback when database was closed
  async _onClose (db) {
    const address = db.address.toString()
    logger.debug(`Close ${address}`)

    // Unsubscribe from pubsub
    if (this._pubsub) {
      await this._pubsub.unsubscribe(address)
    }

    const dir = db && db.options.directory ? db.options.directory : this.directory
    const cache = this.caches[dir]

    if (cache && cache.handlers.has(address)) {
      cache.handlers.delete(address)
      if (!cache.handlers.size) await cache.cache.close()
    }

    delete this.stores[address]
  }

  async _onDrop (db) {
    const address = db.address.toString()
    const dir = db && db.options.directory ? db.options.directory : this.directory
    await this._requestCache(address, dir, db._cache)
  }

  async _onLoad (db) {
    const address = db.address.toString()
    const dir = db && db.options.directory ? db.options.directory : this.directory
    await this._requestCache(address, dir, db._cache)
    this.stores[address] = db
  }

  /* Open databases */

  async determineAddress (name, type, options = {}) {
    if (!OrbitDB.isValidType(type)) { throw new Error(`Invalid database type '${type}'`) }

    if (Address.asAddress(name)) { throw new Error('Given database name is an address. Please give only the name of the database!') }

    // Save the manifest to IPFS
    const manifest = await Manifest.create(this, { name, type, ...options })

    return manifest.address.toString()
  }

  async _requestCache (address, directory, existingCache) {
    const dir = directory || this.directory
    if (!this.caches[dir]) {
      const newCache = existingCache || await this._createCache(dir)
      this.caches[dir] = { cache: newCache, handlers: new Set() }
    }
    this.caches[dir].handlers.add(address)
    const cache = this.caches[dir].cache

    // "Wake up" the caches if they need it
    if (cache) await cache.open()

    return cache
  }

  /*
      options = {
        localOnly: false // if set to true, throws an error if database can't be found locally
        create: false // whether to create the database
        type: TODO
        overwrite: TODO

      }
   */
  async open (address, options = {}) {
    logger.debug('open()')
    address = Address.fromString(address.toString())

    logger.debug(`Open database '${address}'`)

    // If database is already open, return early by returning the instance
    // if (this.stores[address]) {
    //   return this.stores[address]
    // }

    // Get the database manifest from IPFS
    logger.debug(`Loading Manifest for '${address}'`)
    const manifest = await Manifest.fetch(this, address, { timeout: options.timeout || defaultTimeout })
    logger.debug(`Manifest for '${address}':\n${JSON.stringify(manifest, null, 2)}`)

    // Make sure the type from the manifest matches the type that was given as an option
    if (options.type && manifest.type !== options.type) {
      throw new Error(`Database '${address}' is type '${manifest.type}' but was opened as '${options.type}'`)
    }

    options.cache = await this._requestCache(manifest.pathkey, options.directory)

    // Check if we have the database
    const haveDB = await this._haveLocalData(options.cache, manifest.pathkey)

    logger.debug((haveDB ? 'Found' : 'Didn\'t find') + ` database '${address}'`)

    // If we want to try and open the database local-only, throw an error
    // if we don't have the database locally
    if (options.localOnly && !haveDB) {
      logger.warn(`Database '${address}' doesn't exist!`)
      throw new Error(`Database '${address}' doesn't exist!`)
    }

    // Save the database locally
    await this._addManifestToCache(options.cache, manifest)

    // Open the the database
    options = Object.assign({}, options, { accessControllerAddress: manifest.accessController, meta: manifest.meta })
    return this._createStore(manifest, options)
  }

  async _addManifestToCache (cache, manifest) {
    await cache.set(path.join(manifest.pathkey, '_manifest'), manifest.cid.toString())
    logger.debug(`Saved manifest to IPFS as '${manifest.cid}'`)
  }

  /**
   * Check if we have the database, or part of it, saved locally
   * @param  {[Cache]} cache [The OrbitDBCache instance containing the local data]
   * @param  {[OrbitDBAddress]} dbAddress [Address of the database to check]
   * @return {[Boolean]} [Returns true if we have cached the db locally, false if not]
   */
  async _haveLocalData (cache, address) {
    if (!cache) {
      return false
    }

    const data = await cache.get(path.join(address, '_manifest'))
    return data !== undefined && data !== null
  }

  /**
   * Runs all migrations inside the src/migration folder
   * @param Object options  Options to pass into the migration
   * @param OrbitDBAddress dbAddress Address of database in OrbitDBAddress format
   */
  async _migrate (options, dbAddress) {
    await migrations.run(this, options, dbAddress)
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
}

OrbitDB.prototype.AccessControllers = AccessControllers
OrbitDB.prototype.Identities = Identities
OrbitDB.prototype.Keystore = Keystore

module.exports = OrbitDB
