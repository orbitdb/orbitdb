'use strict'

const EventEmitter  = require('events').EventEmitter
const EventStore    = require('orbit-db-eventstore')
const FeedStore     = require('orbit-db-feedstore')
const KeyValueStore = require('orbit-db-kvstore')
const CounterStore  = require('orbit-db-counterstore')
const DocumentStore = require('orbit-db-docstore')
const Pubsub        = require('orbit-db-pubsub')
const Cache         = require('./Cache')

const defaultNetworkName = 'Orbit DEV Network'

class OrbitDB {
  constructor(ipfs, id = 'default', options = {}) {
    this._ipfs = ipfs
    this._pubsub = options && options.broker ? new options.broker(ipfs) : new Pubsub(ipfs)
    this.user = { id: id }
    this.network = { name: defaultNetworkName }
    this.events = new EventEmitter()
    this.stores = {}
  }

  /* Databases */
  feed(dbname, options) {
    return this._createStore(FeedStore, dbname, options)
  }

  eventlog(dbname, options) {
    return this._createStore(EventStore, dbname, options)
  }

  kvstore(dbname, options) {
    return this._createStore(KeyValueStore, dbname, options)
  }

  counter(dbname, options) {
    return this._createStore(CounterStore, dbname, options)
  }

  docstore(dbname, options) {
    return this._createStore(DocumentStore, dbname, options)
  }

  disconnect() {
    if (this._pubsub) this._pubsub.disconnect()
    this.events.removeAllListeners('data')
    Object.keys(this.stores).map((e) => this.stores[e]).forEach((store) => {
      store.events.removeAllListeners('data')
      store.events.removeAllListeners('write')
      store.events.removeAllListeners('close')
    })
    this.stores = {}
    this.user = null
    this.network = null
  }

  /* Private methods */
  _createStore(Store, dbname, options = { subscribe: true }) {
    const store = new Store(this._ipfs, this.user.id, dbname, options)
    this.stores[dbname] = store
    return this._subscribe(store, dbname, options.subscribe, options.cachePath)
  }

  _subscribe(store, dbname, subscribe = true, cachePath = './orbit-db') {
    store.events.on('data',  this._onData.bind(this))
    store.events.on('write', this._onWrite.bind(this))
    store.events.on('close', this._onClose.bind(this))

    if(subscribe && this._pubsub)
      this._pubsub.subscribe(dbname, this._onMessage.bind(this), this._onConnected.bind(this), store.options.maxHistory > 0)
    else
      store.loadHistory().catch((e) => console.error(e.stack))

    Cache.loadCache(cachePath).then(() => {
      const hash = Cache.get(dbname)
      store.loadHistory(hash).catch((e) => console.error(e.stack))
    })

    return store
  }

  /* Connected to the message broker */
  _onConnected(dbname, hash) {
    // console.log(".CONNECTED", dbname, hash)
    const store = this.stores[dbname]
    store.loadHistory(hash).catch((e) => console.error(e.stack))
  }

  /* Replication request from the message broker */
  _onMessage(dbname, hash) {
    // console.log(".MESSAGE", dbname, hash)
    const store = this.stores[dbname]
    store.sync(hash)
      .then((res) => Cache.set(dbname, hash))
      .catch((e) => console.error(e.stack))
  }

  /* Data events */
  _onWrite(dbname, hash) {
    // 'New entry written to database...', after adding a new db entry locally
    // console.log(".WRITE", dbname, hash, this.user.username)
    if(!hash) throw new Error("Hash can't be null!")
    if(this._pubsub) this._pubsub.publish(dbname, hash)
    Cache.set(dbname, hash)
  }

  _onData(dbname, items) {
    // 'New database entry...', after a new entry was added to the database
    // console.log(".SYNCED", dbname, items.length)
    this.events.emit('data', dbname, items)
  }

  _onClose(dbname) {
    if(this._pubsub) this._pubsub.unsubscribe(dbname)
    delete this.stores[dbname]
  }
}

module.exports = OrbitDB
