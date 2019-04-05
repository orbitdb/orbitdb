'use strict'

class AccessController {
  constructor () {
    this._access = { 
      admin: [], 
      write: [],  
      read: [], // Not used atm
    }
  }

  /* Overridable functions */
  async load (address) {
    // Transform '/ipfs/QmPFtHi3cmfZerxtH9ySLdzpg1yFhocYDZgEZywdUXHxFU'
    // to 'QmPFtHi3cmfZerxtH9ySLdzpg1yFhocYDZgEZywdUXHxFU'
    address = address.toString().replace(/\\/g, '/');
    if (address.indexOf('/ipfs') === 0)
      address = address.split('/')[2]
  }
  async save () {}

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

  /* Public Methods */
  add (access, key) {
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

  remove (access, key) {
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
}

module.exports = AccessController
