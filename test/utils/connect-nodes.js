import { multiaddr } from '@multiformats/multiaddr'

const defaultFilter = () => true

const isBrowser = () => typeof window !== 'undefined'

const connectIpfsNodes = async (ipfs1, ipfs2, options = {
  filter: defaultFilter
}) => {
  if (isBrowser()) {
    ipfs1.libp2p.addEventListener('self:peer:update', async (event) => {
      if (ipfs1.libp2p.getMultiaddrs().length > 0) {
        await ipfs2.libp2p.peerStore.save(ipfs1.libp2p.peerId, { multiaddrs: ipfs1.libp2p.getMultiaddrs().filter(options.filter) })
        await ipfs2.libp2p.dial(ipfs1.libp2p.peerId)
        await ipfs1.libp2p.hangUp(multiaddr('/ip4/127.0.0.1/tcp/12345/ws/p2p/QmQ2zigjQikYnyYUSXZydNXrDRhBut2mubwJBaLXobMt3A'))
      }
    })

    await ipfs1.libp2p.dial(multiaddr('/ip4/127.0.0.1/tcp/12345/ws/p2p/QmQ2zigjQikYnyYUSXZydNXrDRhBut2mubwJBaLXobMt3A'))
  } else {
    await ipfs2.libp2p.peerStore.save(ipfs1.libp2p.peerId, { multiaddrs: ipfs1.libp2p.getMultiaddrs().filter(options.filter) })
    await ipfs2.libp2p.dial(ipfs1.libp2p.peerId)
  }
}

export default connectIpfsNodes
