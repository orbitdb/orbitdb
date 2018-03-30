'use strict'

const EventEmitter = require('events').EventEmitter
const AccessController = require('./access-controller')
const { ensureAddress } = require('./utils')

const Logger = require('logplease')
const logger = Logger.create("orbit-db-access-controller", { color: Logger.Colors.Red })

class OrbitDBAccessController extends EventEmitter {
  constructor (orbitdb) {
    super()
    this._orbitdb = orbitdb
    this._db = null
    this.controllerType = 'orbitdb'
  }

  get capabilities () {
    if (this._db) {
      let capabilities = this._db.all()
      // Merge with the root controller access map
      Object.entries(this._db.access.capabilities).forEach(e => {
        const key = e[0]
        const oldValue = capabilities[key] || []
        capabilities[key] = Array.from(new Set([...oldValue, ...e[1]]))
      })
      return capabilities
    }
    return {}
  }

  get (capability) {
    return this.capabilities[capability]
  }

  async close () {
    await this._db.close()
  }

  async load (address) {
    if (this._db)
      await this._db.close()

    this._db = await this._orbitdb.keyvalue(ensureAddress(address), {
      accessControllerType: 'ipfs', // the "root controller" is immutable, use ipfs controller
      sync: true,
      write: [this._orbitdb.key.getPublic('hex')],
    })

    this._db.events.on('ready', this._onUpdate.bind(this))
    this._db.events.on('write', this._onUpdate.bind(this))
    this._db.events.on('replicated', this._onUpdate.bind(this))

    await this._db.load()
  }

  async save () {
    return Promise.resolve(this._db.address.toString())
  }

  async add (capability, key) {
    // Merge current keys with the new key
    const capabilities = new Set([...(this._db.get(capability) || []), ...[key]])
    await this._db.put(capability, Array.from(capabilities))
  }

  async remove (capability, key) {
    let capabilities = new Set(this._db.get(capability) || [])
    capabilities.delete(key)
    if (capabilities.size > 0) {
      await this._db.put(capability, Array.from(capabilities))
    } else {
      await this._db.del(capability)
    }
  }

  /* Private methods */
  _onUpdate () {
    this.emit('updated')
  }
}

module.exports = OrbitDBAccessController