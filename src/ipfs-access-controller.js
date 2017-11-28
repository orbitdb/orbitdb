'use strict'

const AccessController = require('./access-controller')

class IPFSAccessController extends AccessController {
  constructor (ipfs) {
    super()
    this._ipfs = ipfs
  }

  async load (address) {
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
