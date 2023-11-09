import { multiaddr } from '@multiformats/multiaddr'
import { WebRTC } from '@multiformats/multiaddr-matcher'
import waitFor from './wait-for.js'

const defaultFilter = () => true

const isBrowser = () => typeof window !== 'undefined'

const connectIpfsNodes = async (ipfs1, ipfs2, options = {
  filter: defaultFilter
}) => {
  if (isBrowser()) {
    const relayId = '12D3KooWAJjbRkp8FPF5MKgMU53aUTxWkqvDrs4zc1VMbwRwfsbE'

    await ipfs1.libp2p.dial(multiaddr(`/ip4/127.0.0.1/tcp/12345/ws/p2p/${relayId}`))

    let a1

    await waitFor(() => {
      a1 = ipfs1.libp2p.getMultiaddrs().filter(ma => WebRTC.matches(ma)).pop()

      if (a1 != null) {
        return true
      } else {
        return false
      }
    }, () => true)

    await ipfs2.libp2p.dial(a1)
  } else {
    await ipfs2.libp2p.peerStore.save(ipfs1.libp2p.peerId, { multiaddrs: ipfs1.libp2p.getMultiaddrs().filter(options.filter) })
    await ipfs2.libp2p.dial(ipfs1.libp2p.peerId)
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, 1000)
  })
}

export default connectIpfsNodes
