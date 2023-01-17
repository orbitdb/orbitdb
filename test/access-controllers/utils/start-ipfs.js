import * as IPFSFactory from 'ipfsd-ctl'
import { testAPIs } from './test-apis.js'

/**
 * Start an IPFS instance
 * @param  {Object}  config  [IPFS configuration to use]
 * @return {[Promise<IPFS>]} [IPFS instance]
 */
export default (type, config = {}) => {
  return new Promise((resolve, reject) => {
    if (!testAPIs[type]) {
      reject(new Error(`Wanted API type ${JSON.stringify(type)} is unknown. Available types: ${Object.keys(testAPIs).join(', ')}`))
    }

    // Spawn an IPFS daemon (type defined in)
    IPFSFactory
      .create(testAPIs[type])
      .spawn(config, async (err, ipfsd) => {
        if (err) {
          reject(err)
        }

        resolve(ipfsd)
      })
  })
}
