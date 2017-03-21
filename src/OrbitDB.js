'use strict'

const EventEmitter  = require('events').EventEmitter
const EventStore    = require('orbit-db-eventstore')
const FeedStore     = require('orbit-db-feedstore')
const KeyValueStore = require('orbit-db-kvstore')
const CounterStore  = require('orbit-db-counterstore')
const DocumentStore = require('orbit-db-docstore')
const Pubsub        = require('orbit-db-pubsub')

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

  close(dbname) {
    if(this._pubsub) this._pubsub.unsubscribe(dbname)
    if (this.stores[dbname]) {
      this.stores[dbname].events.removeAllListeners('write')
      delete this.stores[dbname]
    }
  }

  disconnect() {
    Object.keys(this.stores).forEach((e) => this.close(e))
    if (this._pubsub) this._pubsub.disconnect()
    this.stores = {}
    this.user = null
    this.network = null
  }

  /* Private methods */
  _createStore(Store, dbname, options) {
    const opts = Object.assign({ replicate: true }, options)

    const store = new Store(this._ipfs, this.user.id, dbname, opts)
    store.events.on('write', this._onWrite.bind(this))
    store.events.on('ready', this._onReady.bind(this))

    this.stores[dbname] = store

    if(opts.replicate && this._pubsub)
      this._pubsub.subscribe(dbname, this._onMessage.bind(this))

    return store
  }

  /* Replication request from the message broker */
  _onMessage(dbname, heads) {
    // console.log(".MESSAGE", dbname, heads)
    const store = this.stores[dbname]
    store.sync(heads)
  }

  /* Data events */
  _onWrite(dbname, hash, entry, heads) {
    // 'New entry written to database...', after adding a new db entry locally
    // console.log(".WRITE", dbname, hash, this.user.username)
    if(!heads) throw new Error("'heads' not defined")
    if(this._pubsub) setImmediate(() => this._pubsub.publish(dbname, heads))
  }

  _onReady(dbname, heads) {
    // if(heads && this._pubsub) setImmediate(() => this._pubsub.publish(dbname, heads))
    if(heads && this._pubsub) {
      setTimeout(() => this._pubsub.publish(dbname, heads), 1000)
    }
  }
}

module.exports = OrbitDB
