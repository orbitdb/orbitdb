/**
 * Stop an IPFS or ipfsd-ctl instance
 * @param  {Object}  config  [IPFS ipfsd-ctl to stop]
 * @return {None}
 */
export default (ipfs) => {
  return new Promise((resolve, reject) => {
    ipfs.stop((err) => {
      if (err) { reject(err) }
      resolve()
    })
  })
}
