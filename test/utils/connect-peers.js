'use strict'

const connectIpfsNodes = async (ipfs1, ipfs2) => {
  const id1 = await ipfs1.id()
  const id2 = await ipfs2.id()
  console.log("peer1.id>", id1)
  console.log("peer2.id>", id2)
  try {
    const a = await ipfs1.swarm.connect(id2.addresses[0])
    // const b = await ipfs2.swarm.connect(id1.addresses[0])
    console.log("swarm.peer1.connect>", a)
    // console.log("swarm.peer2.connect>", b)
    const peers = await ipfs1.swarm.peers()
    console.log("swarm.peer1.peers>", peers)
  } catch (e) {
    console.error("Error connecting nodes!", e)
  }
  console.log("connected!")
  // return new Promise(resolve => setTimeout(resolve, 1000))
}

module.exports = connectIpfsNodes
