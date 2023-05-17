/**
 * @module Address
 * @description OrbitDB database address verification.
 */
import { CID } from 'multiformats/cid'
import { base58btc } from 'multiformats/bases/base58'
import { posixJoin } from './utils/path-join.js'

/**
 * Validates an OrbitDB database address.
 * @function
 * @param {OrbitDBAddress|string} address An OrbitDB database address.
 * @return {boolean} True if the address is a valid OrbitDB database address,
 * false otherwise.
 * @static
 */
const isValidAddress = (address) => {
  address = address.toString()

  if (!address.startsWith('/orbitdb') && !address.startsWith('\\orbitdb')) {
    return false
  }

  address = address.replaceAll('/orbitdb/', '')
  address = address.replaceAll('\\orbitdb\\', '')
  address = address.replaceAll('/', '')
  address = address.replaceAll('\\', '')

  let cid
  try {
    cid = CID.parse(address, base58btc)
  } catch (e) {
    return false
  }

  return cid !== undefined
}

/**
 * Parses an OrbitDB database address.
 * @function
 * @param {OrbitDBAddress|string} address A valid OrbitDB database address.
 * @return {OrbitDBAddress} An instance of OrbitDBAddress.
 * @throws Not a valid OrbitDB address if no address if provided.
 * @throws Not a valid OrbitDB address if address is invalid.
 * @static
 */
const parseAddress = (address) => {
  if (!address) {
    throw new Error(`Not a valid OrbitDB address: ${address}`)
  }

  if (!isValidAddress(address)) {
    throw new Error(`Not a valid OrbitDB address: ${address}`)
  }

  return OrbitDBAddress(address)
}

/**
 * Creates an instance of OrbitDBAddress.
 * @function
 * @param {OrbitDBAddress|string} address A valid OrbitDB database address.
 * @returns {OrbitDBAddress} An instance of OrbitDBAddress.
 * @instance
 */
const OrbitDBAddress = (address) => {
  /**
   * @namespace module:Address~OrbitDBAddress
   * @description The instance returned by {@link module:Address~OrbitDBAddress}.
   */

  if (address && address.protocol === 'orbitdb' && address.path) {
    return address
  }

  /**
   * The 'orbitdb' protocol.
   * @memberof module:Address~OrbitDBAddress
   */
  const protocol = 'orbitdb'

  /**
   * The path without the /orbitdb/ prefix.
   * @memberof module:Address~OrbitDBAddress
   */
  const path = address.replace('/orbitdb/', '').replace('\\orbitdb\\', '')

  /**
   * Returns OrbitDBAddress as a string.
   * @function
   * @returns {string} The string form of OrbitDBAddress.
   * @memberof module:Address~OrbitDBAddress
   */
  const toString = () => {
    return posixJoin('/', protocol, path)
  }

  return {
    protocol,
    path,
    address,
    toString
  }
}

export { OrbitDBAddress as default, isValidAddress, parseAddress }
