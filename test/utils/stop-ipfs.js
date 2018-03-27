'use strict'

/**
 * Stop an IPFS or ipfsd-ctl instance
 * @param  {Object}  config  [IPFS ipfsd-ctl to stop]
 * @return {None}
 */
const stopIpfs = (ipfs) => {
  return new Promise(async (resolve, reject) => {
    ipfs.stop((err) => {
      if (err) { reject(err) }
      resolve()
    })
  })
}

module.exports = stopIpfs
