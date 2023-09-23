import { multiaddr } from '@multiformats/multiaddr'

const defaultFilter = () => true

const isBrowser = () => typeof window !== 'undefined'

const connectIpfsNodes = async (ipfs1, ipfs2, options = {
  filter: defaultFilter
}) => {
  if (isBrowser()) {
    ipfs1.libp2p.addEventListener('self:peer:update', async (event) => {
      await ipfs2.libp2p.peerStore.patch(ipfs1.libp2p.peerId, { multiaddrs: ipfs1.libp2p.getMultiaddrs().filter(options.filter) })
      await ipfs2.libp2p.dial(ipfs1.libp2p.peerId)
    })

    await ipfs1.libp2p.dial(multiaddr('/ip4/127.0.0.1/tcp/43669/ws/p2p/12D3KooWKwtgL5GTathFbTDunVZKPmD1gTwnDCEPRyf7r8hdqwQw'))
  } else {
    await ipfs2.libp2p.peerStore.patch(ipfs1.libp2p.peerId, { multiaddrs: ipfs1.libp2p.getMultiaddrs().filter(options.filter) })
    await ipfs2.libp2p.dial(ipfs1.libp2p.peerId)
  }
}

export default connectIpfsNodes
