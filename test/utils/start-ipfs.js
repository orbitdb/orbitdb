'use strict'

const IPFSFactory = require('ipfsd-ctl')
const testAPIs = require('./test-apis')

/**
 * Start an IPFS instance
 * @param  {Object}  config  [IPFS configuration to use]
 * @return {[Promise<IPFS>]} [IPFS instance]
 */
const startIpfs = (type, config = {}) => {
  return new Promise((resolve, reject) => {
    if (!testAPIs[type]) {
      reject(new Error(`Wanted API type ${JSON.stringify(type)} is unknown. Available types: ${Object.keys(testAPIs).join(', ')}`))
    }

    // If we're starting a process, pass command line arguments to it
    if (!config.args) {
      config.args = ['--enable-pubsub-experiment']
    }

    // Spawn an IPFS daemon (type defined in)
    IPFSFactory
      .create(testAPIs[type])
      .spawn(config, async (err, ipfsd) => {
        if (err) { 
          reject(err) 
        }

        // Monkey patch _peerInfo to the ipfs api/instance
        // to make js-ipfs-api compatible with js-ipfs
        // TODO: Get IPFS id via coherent API call (without it being asynchronous)
        if (!ipfsd.api._peerInfo) {
          let { id } = await ipfsd.api.id()
          ipfsd.api._peerInfo = { id: { _idB58String: id } }
        }

        resolve(ipfsd)
      })
  })
}

module.exports = startIpfs
