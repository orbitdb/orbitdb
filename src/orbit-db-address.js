import * as Path from 'path'
import { CID } from 'multiformats/cid'
import { base58btc } from 'multiformats/bases/base58'

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

const parseAddress = (address) => {
  if (!address) {
    throw new Error(`Not a valid OrbitDB address: ${address}`)
  }

  if (!isValidAddress(address)) {
    throw new Error(`Not a valid OrbitDB address: ${address}`)
  }

  return OrbitDBAddress(address)
}

const OrbitDBAddress = (address) => {
  if (address && address.protocol === 'orbitdb' && address.path) {
    return address
  }

  const protocol = 'orbitdb'
  const path = address.replace('/orbitdb/', '').replace('\\orbitdb\\', '')

  const toString = () => {
    return (Path.posix || Path).join('/', protocol, '/', path)
  }

  return {
    protocol,
    path,
    address,
    toString
  }
}

export { OrbitDBAddress as default, isValidAddress, parseAddress }
