'use strict'

const defaultFilter = () => true

const connectIpfsNodes = async (ipfs1, ipfs2, options = {
  filter: defaultFilter
}) => {
  const id1 = await ipfs1.id()
  const id2 = await ipfs2.id()

  const addresses1 = id1.addresses.filter(options.filter)
  const addresses2 = id2.addresses.filter(options.filter)

  for (const a2 of addresses2) {
    await ipfs1.swarm.connect(a2)
  }
  for (const a1 of addresses1) {
    await ipfs2.swarm.connect(a1)
  }
}

export default connectIpfsNodes
