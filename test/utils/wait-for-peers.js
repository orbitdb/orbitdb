'use strict'

const waitForPeers = (ipfs, peersToWait, topic) => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const peers = await ipfs.libp2p.services.pubsub.getPeers(topic)
        const peerIds = peers.map(peer => peer.toString())
        const peerIdsToWait = peersToWait.map(peer => peer.toString())

        const hasAllPeers = peerIdsToWait.map((e) => peerIds.includes(e)).filter((e) => e === false).length === 0

        // FIXME: Does not fail on timeout, not easily fixable
        if (hasAllPeers) {
          console.log('Found peers!')
          clearInterval(interval)
          resolve()
        }
      } catch (e) {
        clearInterval(interval)
        reject(e)
      }
    }, 200)
  })
}

export default waitForPeers
