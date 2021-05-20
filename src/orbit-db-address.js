'use strict'
const path = require('path')
const CID = require('cids')

const notEmpty = e => e !== '' && e !== ' '

/**
 * OrbitDB Addresses validation, parsing and generation
 */
class OrbitDBAddress {
  constructor (root, path) {
    this.root = root
    this.path = path
  }

  toString () {
    return OrbitDBAddress.join(this.root, this.path)
  }

  /**
   * Validate, that an address follows this format:
   * `/orbitdb/<multihash>/<name>`
   *
   * @param {OrbitDBAddress|string} address to validate.
   * @returns {boolean} whether the address has a valid format.
   */
  static isValid (address) {
    address = address.toString().replace(/\\/g, '/')

    const containsProtocolPrefix = (e, i) => !((i === 0 || i === 1) && address.toString().indexOf('/orbit') === 0 && e === 'orbitdb')

    const parts = address.toString()
      .split('/')
      .filter(containsProtocolPrefix)
      .filter(notEmpty)

    let accessControllerHash

    const validateHash = (hash) => {
      const prefixes = ['zd', 'Qm', 'ba', 'k5']
      for (const p of prefixes) {
        if (hash.indexOf(p) > -1) {
          return true
        }
      }
      return false
    }

    try {
      accessControllerHash = validateHash(parts[0])
        ? new CID(parts[0]).toBaseEncodedString()
        : null
    } catch (e) {
      return false
    }

    return accessControllerHash !== null
  }

  /**
   * Parse an address
   * @param {OrbitDBAddress|string} address to parse.
   * @return {OrbitDBAddress} parsed address
   */
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

  /**
   * Join with prefix /orbitdb
   */
  static join (...paths) {
    return (path.posix || path).join('/orbitdb', ...paths)
  }
}

module.exports = OrbitDBAddress
