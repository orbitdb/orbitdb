'use strict'

const path = require('path')
const multihash = require('multihashes')

class OrbitDBAddress {
  constructor (root, path) {
    this.root = root
    this.path = path
  }

  toString () {
    return ['/orbitdb', this.root, this.path].join('/')
  }

  static isValid (address) {
    address = address.toString().replace(/\\/g, '/');
    const parts = address.split('/')
      .filter((e, i) => !((i === 0 || i === 1) && address.indexOf('/orbit') === 0 && e === 'orbitdb'))
      .filter(e => e !== '' && e !== ' ')

    const accessControllerHash = parts[0].indexOf('Qm') > -1 ? multihash.fromB58String(parts[0]) : null
    try {
      multihash.validate(accessControllerHash)
    } catch (e) {
      return false
    }

    return accessControllerHash !== null
  }

  static parse (address) {
    if (!address) 
      throw new Error(`Not a valid OrbitDB address: ${address}`)

    if (!OrbitDBAddress.isValid(address))
      throw new Error(`Not a valid OrbitDB address: ${address}`)

    address = address.toString().replace(/\\/g, '/');
    const parts = address.split('/')
      .filter((e, i) => !((i === 0 || i === 1) && address.indexOf('/orbit') === 0 && e === 'orbitdb'))
      .filter(e => e !== '' && e !== ' ')

    return new OrbitDBAddress(parts[0], parts.slice(1, parts.length).join('/'))
  }
}

module.exports = OrbitDBAddress
