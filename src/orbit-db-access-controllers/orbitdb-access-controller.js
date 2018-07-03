'use strict'

const EventEmitter = require('events').EventEmitter
const AccessController = require('./access-controller')
const { ensureAddress } = require('./utils')

const Logger = require('logplease')
const logger = Logger.create("orbit-db-access-controller", { color: Logger.Colors.Red })

class OrbitDBAccessController extends EventEmitter {
  constructor (orbitdb, key, keystore) {
    super()
    this._orbitdb = orbitdb
    this._keystore = keystore
    this._key = key
    this._db = null
    this.controllerType = 'orbitdb'
  }

  getSigningKey () {
    return this._key
  }

  getPublicSigningKey (format = 'hex') {
    return this._key.getPublic(format)
  }

  canAppend (signingKey) {
    // If the ACL contains '*', allow append
      if (this.get('write').includes('*'))
      return true

    // If the ACl contains the given key, allow
    if (this.get('write').includes(signingKey))
      return true

    return false
  }

  async sign (data) {
    // Verify that we're allowed to write
    if (!this.canAppend(this.getPublicSigningKey('hex')))
      throw new Error("Not allowed to write")

    // TODO: this should not handle encoding!
    const signature = await this._keystore.sign(this._key, Buffer.from(JSON.stringify(data)))
    return signature
  }

  async verify (signingKey, signature, data) {
    // TODO: need to check against timestamp, ie. "was this key able to write at this time?"
    if (!this.canAppend(signingKey))
      throw new Error("Input log contains entries that are not allowed in this log")

    const pubKey = await this._keystore.importPublicKey(signingKey)
    try {
      // TODO: this should not handle encoding!
      await this._keystore.verify(signature, pubKey, Buffer.from(JSON.stringify(data)))
    } catch (e) {
      throw new Error(`Invalid signature '${signature}'`)
    }
  }

  get capabilities () {
    if (this._db) {
      // let capabilities = this._db.all()
      let capabilities = this._db._index._index
      // Merge with the root controller access map
      Object.entries(this._db.acl.capabilities).forEach(e => {
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
