'use strict'

const getIpfsPeerId = async (ipfs) => {
  const peerId = await ipfs.id()
  return peerId.id
}

export default getIpfsPeerId
