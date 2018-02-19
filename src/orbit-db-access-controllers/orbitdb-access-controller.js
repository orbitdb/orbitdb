'use strict'

const path = require('path')
const AccessController = require('./access-controller')

const Logger = require('logplease')
const logger = Logger.create("orbit-db-access-controller", { color: Logger.Colors.Green })

class OrbitDBAccessController extends AccessController {
  constructor (orbitdb) {
    super()
    this._orbitdb = orbitdb
    this._db = null
    this.controllerType = 'orbitdb'
  }

  get capabilities () {
    // console.log("!!!!!!!!!!!")
    // console.log(this._capabilities)
    // console.log(this._db.access.capabilities)
    if (this._db) {
      Object.entries(this._db.access.capabilities).forEach(e => {
        const key = e[0]
        if (!this._capabilities[key]) this._capabilities[key] = []
        this._capabilities[key] = Array.from(new Set([...this._capabilities[key], ...e[1]]))
      })
    }
    // console.log("!!!!!!!!!!!", this._capabilities)
    return this._capabilities
  }

  async init (name) {
    if (this._db)
      await this._db.close()

    const suffix = name.toString().split('/').pop()
    name = suffix === '_access' ? name : path.join(name, '/_access')

    this._db = await this._orbitdb.keyvalue(name, {
      accessControllerType: 'ipfs', // the "root controller" should be immutable, use ipfs as the type
      sync: true,
      write: [this._orbitdb.key.getPublic('hex')],
    })
    this._db.events.on('ready', () => {
      this._capabilities = this._db._index._index
      this.emit('updated')
    })
    this._db.events.on('replicated', () => {
      this._capabilities = this._db._index._index
      this.emit('updated')
    })
    // this._db.events.on('ready', () => {
    //   this._capabilities = this._db._index._index
    //   this.emit('updated')
    // })
    // console.log(">", this.capabilities)
    // Add the creator to the default write capabilities
    // await this.add('write', this._orbitdb.key.getPublic('hex'))
    // console.log(">>", this.capabilities)
    return new Promise(async (resolve) => {
      logger.debug("Load database")
      await this._db.load()
      // Get list of capbalities from the database
      this._capabilities = this._db._index._index
      resolve()
      // if (this._db.peers.length > 0)
      //   return resolve()

      // this._db.events.on('peer', async () => {
      //   console.log("-----------------------------------------------")
      //   console.log("PEEER")
      //   // Load locally persisted state
      //   await this._db.load()
      //   // Get list of capbalities from the database
      //   this._capabilities = this._db._index._index
      //   resolve()
      // })
      // setTimeout(() => {
      //   console.log("TIMEOUT")
      //   resolve()
      // }, 3000)
    })
  }

  async close () {
    await this._db.close()
  }

  async load (address) {
    const suffix = address.toString().split('/').pop()
    const addr = suffix === '_access' ? address : path.join(address, '/_access')
    await this.init(addr)
      // const suffix = address.toString().split('/').pop()
      // address = suffix === '_access' ? address : path.join(address, '/_access')

      // this._db = await this._orbitdb.keyvalue(address)//, {
      // //   accessControllerType: 'ipfs', // the "root controller" should be immutable, use ipfs as the type
      // //   // sync: true,
      // //   // write: [this._orbitdb.key.getPublic('hex')],
      // // })

      // // console.log("---- LOAD! -----")
      // // Load locally persisted state
      // await this._db.load()
      // this._capabilities = this._db._index._index
      // resolve()
    // })
    // return new Promise(resolve => {
    //   setTimeout(() => {
    //     this._capabilities = this._db._index._index
    //     resolve()
    //   }, 2000)
    // })
  }

  async save () {
    return Promise.resolve(this._db.address.toString())
  }

  async add (capability, key) {
    // console.log("add:", capability, key)
    let capabilities = new Set(this._db.get(capability) || [])
    capabilities.add(key)
    this._capabilities[capability] = Array.from(capabilities)
    try {
      await this._db.put(capability, Array.from(capabilities))
      this.emit('updated')
    } catch (e) {
      throw e
    }
  }

  async remove (capability, key) {
    let capabilities = new Set(this._db.get(capability) || [])
    capabilities.delete(key)
    this._capabilities[capability] = Array.from(capabilities)
    try {
      if (capabilities.size > 0) {
        await this._db.put(capability, Array.from(capabilities))
      } else {
        delete this._capabilities[capability]
        await this._db.del(capability)
      }
      this.emit('updated')
    } catch (e) {
      throw e
    }
  }
}

module.exports = OrbitDBAccessController
