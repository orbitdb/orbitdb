import { identifyService } from 'libp2p/identify'
import { webSockets } from '@libp2p/websockets'
import { webRTC } from '@libp2p/webrtc'
import { all } from '@libp2p/websockets/filters'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { circuitRelayTransport } from 'libp2p/circuit-relay'

/**
 * A basic Libp2p configuration for node servers.
 */
export const DefaultLibp2pOptions = {
  addresses: {
    listen: ['/ip4/0.0.0.0/tcp/0/ws']
  },
  transports: [
    webSockets({
      filter: all
    }),
    webRTC(),
    circuitRelayTransport({
      discoverRelays: 1
    })
  ],
  connectionEncryption: [noise()],
  streamMuxers: [
    yamux()
  ],
  connectionGater: {
    denyDialMultiaddr: () => {
      return false
    }
  },
  services: {
    identify: identifyService(),
    pubsub: gossipsub({ allowPublishToZeroPeers: true })
  }
}

/**
 * A basic Libp2p configuration for browser nodes.
 */
export const DefaultLibp2pBrowserOptions = {
  addresses: {
    listen: ['/webrtc']
  },
  transports: [
    webSockets({
      filter: all
    }),
    webRTC(),
    circuitRelayTransport({
      discoverRelays: 1
    })
  ],
  connectionEncryption: [noise()],
  streamMuxers: [
    yamux()
  ],
  connectionGater: {
    denyDialMultiaddr: () => {
      return false
    }
  },
  services: {
    identify: identifyService(),
    pubsub: gossipsub({ allowPublishToZeroPeers: true })
  }
}
