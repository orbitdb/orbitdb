'use strict'

const IPFSCtl = require('ipfsd-ctl')
const fs = require('fs-extra')
const testAPIs = require('./test-apis')

/**
 * Start an IPFS instance
 * @param  {Object}  config  [IPFS configuration to use]
 * @return {[Promise<IPFS>]} [IPFS instance]
 */
const startIpfs = async (type, config = {}) => {
  if (!testAPIs[type]) {
    throw new Error(`Wanted API type ${JSON.stringify(type)} is unknown. Available types: ${Object.keys(testAPIs).join(', ')}`)
  }

  // If we're starting a process, pass command line arguments to it
  let args
  if (!config.args && type.includes('go')) {
    args = ['--enable-pubsub-experiment']
  }

  // Spawn an IPFS daemon (type defined in)
  if (config.repo && typeof config.repo == "string") {
    await fs.ensureDir(config.repo)
  }
  const IPFSFactory = IPFSCtl.createFactory(testAPIs[type])
  const ipfsd = await IPFSFactory.spawn({ ipfsOptions: config, args })

  // Monkey patch _peerInfo to the ipfs api/instance
  // to make js-ipfs-api compatible with js-ipfs
  // TODO: Get IPFS id via coherent API call (without it being asynchronous)
  await new Promise((resolve) => {
    setTimeout(async () => {
      if (!ipfsd.api._peerInfo) {
        let { id } = await ipfsd.api.id()
        ipfsd.api._peerInfo = { id: { _idB58String: id } }
      }

      resolve(ipfsd)
    }, 500)
  })

  return ipfsd
}

module.exports = startIpfs
