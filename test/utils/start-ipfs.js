'use strict'

const IPFS = require('ipfs')

/**
 * Start an IPFS instance
 * @param  {Object}  config  [IPFS configuration to use]
 * @return {[Promise<IPFS>]} [IPFS instance]
 */
const startIpfs = (config = {}) => {
  return new Promise((resolve, reject) => {
    const ipfs = new IPFS(config)
    ipfs.on('error', reject)
    ipfs.on('ready', () => resolve(ipfs))
  })
}

module.exports = startIpfs
