'use strict'
const Address = require('./address')
const Block = require('multiformats/block')
const { sha256: hasher } = require('multiformats/hashes/sha2')
const mhtype = 'sha2-256'
const codec = require('@ipld/dag-cbor')
const proxyHandler = {
  get: (target, prop) => prop.startsWith('_') ? undefined : target[prop]
}

class Manifest {
  constructor ({ _block }) {
    Object.keys(_block.value).forEach((k) => { this[k] = _block.value[k] })

    this._block = _block
    this._address = Address.asAddress({ cid: this.cid }, true)
  }

  static async create (orbitdb, { name, type, ...options } = {}) {
    const value = { name, type }
    const accessController = options.accessController || {}
    const accessControllerAddress = await orbitdb.AccessControllers.create(
      orbitdb,
      accessController.type || 'ipfs',
      accessController
    )

    value.accessController = '/ipfs/' + accessControllerAddress
    if (options.meta !== undefined) value.meta = options.meta

    const _block = await Block.encode({ value, codec, hasher })
    await orbitdb._ipfs.block.put(_block.bytes, {
      cid: _block.cid.bytes,
      version: _block.cid.version,
      format: codec.name,
      mhtype,
      pin: options.pin,
      timeout: options.timeout
    })

    return new Proxy(new Manifest({ _block }), proxyHandler)
  }

  static async fetch (orbitdb, address, { timeout } = {}) {
    if (address.cid.code !== codec.code) {
      throw new Error('unsupported manifest encoding')
    }

    const bytes = await orbitdb._ipfs.block.get(address.cid, { timeout })
    const _block = await Block.decode({ bytes, codec, hasher })

    return new Proxy(new Manifest({ _block }), proxyHandler)
  }

  toBytes () {
    return this._block.bytes
  }

  get cid () {
    return this._block.cid
  }

  get address () {
    return this._address
  }

  get pathkey () {
    // prep for new manifest cache key
    return this.address.toString() + this.version && `/${this.name}`
  }
}

module.exports = Manifest
