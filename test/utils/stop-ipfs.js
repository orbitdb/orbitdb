'use strict'

/**
 * Stop an IPFS or ipfsd-ctl instance
 * @param  {Object} ipfsd IPFS ipfsd-ctl to stop
 * @return {Promise<void>}
 * @deprecated use `await ipfsd.stop()` instead
 */
const stopIpfs = (ipfsd) => {
  return ipfsd.stop()
}

module.exports = stopIpfs
