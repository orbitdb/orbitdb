'use strict'

const IPFS = require('ipfs')

/**
 * Stop an IPFS instance
 * @param  {[IPFS]} ipfs [IPFS instance to stop]
 * @return {[Promise]}   [Empty]
 */
const stopIpfs = (ipfs) => {
  return new Promise((resolve, reject) => {
    // TODO: ipfs.stop() should return a Promise, PR it in github/js-ipfs
    ipfs.stop((err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

module.exports = stopIpfs
