'use strict'

// Helper functions

exports.hasIpfsApiWithPubsub = (ipfs) => {
  return ipfs.object.get !== undefined
      && ipfs.object.put !== undefined
      && ipfs.pubsub.publish !== undefined
      && ipfs.pubsub.subscribe !== undefined
}

exports.first = (arr) => {
  return arr[0]
}

exports.last = (arr) => {
  return arr[arr.length - 1]
}
