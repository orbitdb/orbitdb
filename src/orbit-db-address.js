import path from 'path'
import { CID } from 'multiformats/cid'

const notEmpty = e => e !== '' && e !== ' '

export default class OrbitDBAddress {
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
        ? CID.parse(parts[0]).toString()
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
