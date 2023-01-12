export default (ipfs, peersToWait, topic, callback) => {
  return new Promise((resolve, reject) => {
    const i = setInterval(async () => {
      const peers = await ipfs.pubsub.peers(topic)
      const hasAllPeers = peersToWait.map((e) => peers.includes(e)).filter((e) => e === false).length === 0
      if (hasAllPeers) {
        clearInterval(i)
        resolve()
      }
    }, 500)
  })
}
