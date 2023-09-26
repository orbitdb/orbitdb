import { mplex } from "@libp2p/mplex"
import { createLibp2p } from "libp2p"
import { noise } from "@chainsafe/libp2p-noise"
import { circuitRelayServer } from 'libp2p/circuit-relay'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { identifyService } from 'libp2p/identify'
import testKeysPath from '../fixtures/test-keys-path.js'
import { KeyStore } from '../../src/index.js'
import { createFromPrivKey } from '@libp2p/peer-id-factory'
import * as crypto from '@libp2p/crypto'

const keystore = await KeyStore({ path: testKeysPath })
const keys = await keystore.getKey('userX')
const peerId = await createFromPrivKey(keys)

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

server.addEventListener('peer:disconnect', async event => {
  console.log('peer:disconnect', event.detail)
  server.peerStore.delete(event.detail)
})

console.log("p2p addr: ", server.getMultiaddrs().map((ma) => ma.toString()))
// generates a deterministic address: /ip4/127.0.0.1/tcp/33519/ws/p2p/16Uiu2HAmAyxRGfndGAHKaLugUNRG6vBZpgNVRv8yJxZMQEY6o9C7