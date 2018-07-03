'use strict'

const AccessController = require('./access-controller')

class IPFSAccessController extends AccessController {
  constructor(ipfs, key, keystore) {
    super();
    this._ipfs = ipfs;
    this._keystore = keystore
    this._key = key
    this.controllerType = 'ipfs';
  }

  getPublicSigningKey(format = 'hex') {
    return this._key.getPublic(format);
  }

  getSigningKey () {
    return this._key
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

  async load (address) {
    // Transform '/ipfs/QmPFtHi3cmfZerxtH9ySLdzpg1yFhocYDZgEZywdUXHxFU'
    // to 'QmPFtHi3cmfZerxtH9ySLdzpg1yFhocYDZgEZywdUXHxFU'
    if (address.indexOf('/ipfs') === 0)
      address = address.split('/')[2]

    try {
      const dag = await this._ipfs.object.get(address)
      const obj = JSON.parse(dag.toJSON().data)
      this._capabilities = obj
    } catch (e) {
      console.log("ACCESS ERROR:", e)
    }
  }

  async save () {
    let hash
    try {
      const json = JSON.stringify(this.capabilities, null, 2)
      const dag = await this._ipfs.object.put(Buffer.from(json))
      hash = dag.toJSON().multihash.toString()
    } catch (e) {
      console.log("ACCESS ERROR:", e)
    }
    return '/ipfs/' + hash
  }
}

module.exports = IPFSAccessController
