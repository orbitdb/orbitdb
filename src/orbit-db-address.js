'use strict'
const path = require('path')
const { CID } = require('multiformats/cid')
const replaceDelimiter = (address) => address.toString().replace(/\\/g, '/')
const prefix = '/orbitdb/'

class OrbitDBAddress {
  constructor (root, path) {
    this.root = root
    this.path = path
  }

  toString () {
    return OrbitDBAddress.join(this.root, this.path)
  }

  static isValid (address) {
    address = replaceDelimiter(address)

    const prefixed = address.startsWith(prefix)
    if (!prefixed) {
      return false
    }

    try {
      CID.parse(address.split('/')[2])
    } catch (e) {
      return false
    }

    return true
  }

  static parse (address) {
    if (!address || !address.toString || !OrbitDBAddress.isValid(address)) {
      throw new Error(`Not a valid OrbitDB address: ${address}`)
    }

    address = replaceDelimiter(address)

    const [root, ...paths] = address.slice(prefix.length).split('/')

    return new OrbitDBAddress(root, paths.join('/'))
  }

  static join (...paths) {
    return (path.posix || path).join('/orbitdb', ...paths)
  }
}

module.exports = OrbitDBAddress
