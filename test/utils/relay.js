import { mplex } from "@libp2p/mplex"
import { createLibp2p } from "libp2p"
import { noise } from "@chainsafe/libp2p-noise"
import { circuitRelayServer } from 'libp2p/circuit-relay'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { identifyService } from 'libp2p/identify'
import relayPrivKey from '../fixtures/keys/relay.js'
import { createFromPrivKey } from '@libp2p/peer-id-factory'
import { unmarshalPrivateKey } from '@libp2p/crypto/keys'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

const encoded = uint8ArrayFromString(relayPrivKey, 'base64pad')
const privateKey = await unmarshalPrivateKey(encoded)
const peerId = await createFromPrivKey(privateKey)

const server = await createLibp2p({
  peerId,
  addresses: {
    listen: ['/ip4/0.0.0.0/tcp/12345/ws']
  },
  transports: [
    webSockets({
      filter: filters.all
    }),
  ],
  connectionEncryption: [noise()],
  streamMuxers: [mplex()],
  services: {
    identify: identifyService(),
    relay: circuitRelayServer()
  }
})

server.addEventListener('peer:connect', async event => {
  console.log('peer:connect', event.detail)
})

server.addEventListener('peer:disconnect', async event => {
  console.log('peer:disconnect', event.detail)
  server.peerStore.delete(event.detail)
})

console.log("p2p addr: ", server.getMultiaddrs().map((ma) => ma.toString()))
// generates a deterministic address: /ip4/127.0.0.1/tcp/33519/ws/p2p/16Uiu2HAmAyxRGfndGAHKaLugUNRG6vBZpgNVRv8yJxZMQEY6o9C7