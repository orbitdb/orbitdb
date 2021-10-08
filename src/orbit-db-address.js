'use strict'
const path = require('path')
const { CID } = require('multiformats/cid')

class OrbitDBAddress {
  constructor (root, path) {
    this.root = root
    this.path = path
  }

  toString () {
    return OrbitDBAddress.join(this.root, this.path)
  }

  static isValid (address) {
    address = address.toString().replace(/\\/g, '/')

    const parts = address.split('/')

    if (parts.length < 3) return false

    const hasProtocol = address.startsWith('/orbitdb/')

    let validHash

    try {
      validHash = !!CID.parse(parts[2])
    } catch (e) {
      validHash = false
    }

    return hasProtocol && validHash
  }

  static parse (address) {
    if (!address) { throw new Error(`Not a valid OrbitDB address: ${address}`) }

    if (!OrbitDBAddress.isValid(address)) { throw new Error(`Not a valid OrbitDB address: ${address}`) }

    address = address.toString().replace(/\\/g, '/')

    const parts = address.toString()
      .split('/')
      .filter((e, i) => !((i === 0 || i === 1) && address.toString().indexOf('/orbit') === 0 && e === 'orbitdb'))
      .filter(e => e !== '' && e !== ' ')

    return new OrbitDBAddress(parts[0], parts.slice(1, parts.length).join('/'))
  }

  static join (...paths) {
    return (path.posix || path).join('/orbitdb', ...paths)
  }
}

module.exports = OrbitDBAddress
