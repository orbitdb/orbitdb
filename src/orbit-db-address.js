'use strict'
const path = require('path')
const CID = require('cids')

const notEmpty = e => e !== '' && e !== ' '

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

    const containsProtocolPrefix = (e, i) => !((i === 0 || i === 1) && address.toString().indexOf('/orbit') === 0 && e === 'orbitdb')

    const parts = address.toString()
      .split('/')
      .filter(containsProtocolPrefix)
      .filter(notEmpty)

    let accessControllerHash

    try {
      accessControllerHash = (parts[0].indexOf('zd') > -1 || parts[0].indexOf('Qm') > -1 || parts[0].indexOf('ba') > -1)
        ? new CID(parts[0]).toBaseEncodedString()
        : null
    } catch (e) {
      return false
    }

    return accessControllerHash !== null
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
