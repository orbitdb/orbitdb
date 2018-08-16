'use strict'

const waitForPeers = (ipfs, peersToWait, topic, callback) => {
  return new Promise((resolve, reject) => {
    const i = setInterval(async () => {
      try {
        const peers = await ipfs.pubsub.peers(topic)
        const peers2 = await ipfs.swarm.peers()
        console.log("pubsub.peer1.peers>", peers)
        console.log("pubsub.peer2.peers>", peers2)
        const hasAllPeers = peersToWait.map((e) => peers.includes(e)).filter((e) => e === false).length === 0
        if (hasAllPeers) {
          clearInterval(i)
          resolve()
        }
      } catch (e) {
        console.error("--- ERROR ---", e)
        reject(e)
      }
    }, 500)
  })
}

module.exports = waitForPeers
