'use strict'

const AccessController = require('./access-controller')

class IPFSAccessController extends AccessController {
  constructor (ipfs) {
    super()
    this._ipfs = ipfs
    this._access = {
      admin: [], // Not used atm
      write: [],
      read: [], // Not used atm
    }
  }

  /* Properties */
  get admin () {
    return this._access.admin
  }

  get write () {
    // Both admins and write keys can write
    return this._access.write.concat(this._access.admin)
  }

  // Not used atm
  get read () {
    return this._access.read
  }

  async canAppend(entry, identityProvider){
    //verify identity?
    if (this._access.write.includes('*'))
      return true

    if (this._access.write.includes(entry.identity.publicKey))
      return true

    return false
  }

  async grant (access, key) {
    // if(!Object.keys(this._access).includes(access))
    //   throw new Error(`unknown access level: ${access}`)
    // if (!this._access[access].includes(key))
    //   this._access[access].push(key)

    // TODO: uniques only
    switch (access) {
      case 'admin':
        this._access.admin.push(key)
        break
      case 'write':
        this._access.write.push(key)
        break
      case 'read':
        this._access.read.push(key)
        break
      default:
        break
    }
  }

  async revoke (access, key) {
    const without = (arr, e) => {
      const reducer = (res, val) => {
        if (val !== key)
          res.push(val)
        return res
      }
      return arr.reduce(reducer, [])
    }

    // if(!Object.keys(this._access).includes(access))
    //   throw new Error(`unknown access level: ${access}`)
    // if (this._access[access].includes(key))
    //   this._access[access] = without(this._access[access], key)

    switch (access) {
      case 'admin':
        this._access.admin = without(this._access.admin, key)
        break
      case 'write':
        this._access.write = without(this._access.write, key)
        break
      case 'read':
        this._access.read = without(this._access.read, key)
        break
      default:
        break
    }
  }

  async load (accessControllerAddress) {
    return this.setup({ accessControllerAddress });
  }

  async setup ({ accessControllerAddress: address }) {
    // Transform '/ipfs/QmPFtHi3cmfZerxtH9ySLdzpg1yFhocYDZgEZywdUXHxFU'
    // to 'QmPFtHi3cmfZerxtH9ySLdzpg1yFhocYDZgEZywdUXHxFU'
    if (address.indexOf('/ipfs') === 0)
      address = address.split('/')[2]

    try {
      const dag = await this._ipfs.object.get(address)
      const obj = JSON.parse(dag.toJSON().data)
      this._access = obj
    } catch (e) {
      console.log("ACCESS ERROR:", e)
    }
  }

  async save () {
    let hash
    try {
      const access = JSON.stringify(this._access, null, 2)
      const dag = await this._ipfs.object.put(new Buffer(access))
      hash = dag.toJSON().multihash.toString()
    } catch (e) {
      console.log("ACCESS ERROR:", e)
    }
    return hash
  }
}

module.exports = IPFSAccessController
