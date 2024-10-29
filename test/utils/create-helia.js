import { createHelia } from 'helia'
import { bitswap } from '@helia/block-brokers'
import { createLibp2p } from 'libp2p'
import { MemoryBlockstore } from 'blockstore-core'
import { LevelBlockstore } from 'blockstore-level'
import { identify } from '@libp2p/identify'
import { webSockets } from '@libp2p/websockets'
import { webRTC } from '@libp2p/webrtc'
import { all } from '@libp2p/websockets/filters'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'

const isBrowser = () => typeof window !== 'undefined'

const Libp2pOptions = {
  addresses: {
    listen: ['/ip4/0.0.0.0/tcp/0/ws']
  },
  transports: [
    webSockets({
      filter: all
    })
  ],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  connectionGater: {
    denyDialMultiaddr: () => false
  },
  services: {
    identify: identify(),
    pubsub: gossipsub({ allowPublishToZeroTopicPeers: true })
  }
}

/**
 * A basic Libp2p configuration for browser nodes.
 */
const Libp2pBrowserOptions = {
  addresses: {
    listen: ['/webrtc', '/p2p-circuit']
  },
  transports: [
    webSockets({
      filter: all
    }),
    webRTC(),
    circuitRelayTransport()
  ],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  connectionGater: {
    denyDialMultiaddr: () => false
  },
  services: {
    identify: identify(),
    pubsub: gossipsub({ allowPublishToZeroTopicPeers: true })
  }
}

export default async ({ directory } = {}) => {
  const options = isBrowser() ? Libp2pBrowserOptions : Libp2pOptions

  const libp2p = await createLibp2p({ ...options })

  const blockstore = directory ? new LevelBlockstore(`${directory}/blocks`) : new MemoryBlockstore()

  const heliaOptions = {
    blockstore,
    libp2p,
    blockBrokers: [bitswap()]
  }

  return createHelia({ ...heliaOptions })
}
