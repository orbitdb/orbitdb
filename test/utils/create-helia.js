import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'
import { identifyService } from 'libp2p/identify'
import { webSockets } from '@libp2p/websockets'
import { webRTC } from '@libp2p/webrtc'
import { all } from '@libp2p/websockets/filters'
import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { circuitRelayTransport } from 'libp2p/circuit-relay'

const isBrowser = () => typeof window !== 'undefined'

export default async () => {
  const options = {
    addresses: {
      listen: [
        isBrowser() ? '/webrtc' : '/ip4/0.0.0.0/tcp/0/ws'
      ]
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
    streamMuxers: [mplex()],
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

  const libp2p = await createLibp2p(options)

  return await createHelia({ libp2p })
}
