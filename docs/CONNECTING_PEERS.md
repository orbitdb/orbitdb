# Connecting Peers

OrbitDB peers connect to one another using js-libp2p. Connection settings will vary depending on what environment the peer is running in and what system the peers is attempting to connect to.

## Node Daemon to Node Daemon

Node.js allows libp2p to open connections with other Node.js daemons.

```javascript
import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'

const initIPFSInstance = () => {
  const libp2p = await createLibp2p({ ...DefaultLibp2pOptions })
  return createHelia({ libp2p })
}

const ipfs1 = await initIPFSInstance()
const ipfs2 = await initIPFSInstance()

const cid = await ipfs1.block.put('here is some data')
const block = await ipfs2.block.get(cid)
```

On localhost or a local network, both ipfs nodes should discover each other quickly enough so that ipfs2 will retrieve the block added to ipfs1.

In remote networks, retrieval of content across peers may take significantly longer. To speed up communication between the two peers, one peer can be directly connected to another using libp2p's dial function:

```javascript
import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'

const initIPFSInstance = () => {
  const libp2p = await createLibp2p({ ...DefaultLibp2pOptions })
  return createHelia({ libp2p })
}

const ipfs1 = await initIPFSInstance()
const ipfs2 = await initIPFSInstance()

await ipfs2.libp2p.save(ipfs1.libp2p.peerId, { multiaddr: ipfs1.libp2p.getMultiaddrs() })
await ipfs2.libp2p.dial(ipfs1.libp2p.peerId)

const cid = await ipfs1.block.put('here is some data')
const block = await ipfs2.block.get(cid)
```

## Browser to Node Daemon

For various security reasons, a browser cannot dial another peer over a raw TCP or QUIC connection from within a web page.  One option is to use a websocket exposed on the server and dial in via the browser.

On the server, listen for incoming websocket connections:

```javascript
import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { yamux } from '@chainsafe/libp2p-yamux'
import { noise } from '@chainsafe/libp2p-noise'
import { identifyService } from 'libp2p/identify'
import { circuitRelayServer} from 'libp2p/circuit-relay'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'

const options = {
  addresses: {
    listen: ['/ip4/0.0.0.0/tcp/12345/ws']
  },
  transports: [
    webSockets({
      filter: filters.all
    })
  ],
  connectionEncryption: [noise()],
  streamMuxers: [yamux()],
  services: {
    identify: identifyService(),
    relay: circuitRelayServer()
  }
}

const libp2p = createLibp2p(options)
const ipfs1 = await createHelia({ libp2p })
```

Within the browser, dial into the server using the server's exposed web socket:

```javascript
// import the following libraries if using a build environment such as vite.
import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { yamux } from '@chainsafe/libp2p-yamux'
import { identifyService } from 'libp2p/identify'
import { webSockets } from '@libp2p/websockets'
import { webRTC } from '@libp2p/webrtc'
import { noise } from '@chainsafe/libp2p-noise'
import { circuitRelayTransport } from 'libp2p/circuit-relay'

const ws = new webSockets()

const options = {
  addresses: {
    listen: [
      '/webrtc'
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
  streamMuxers: [yamux()],
  connectionGater: {
    denyDialMultiaddr: () => {
      return false
    }
  },
  services: {
    identify: identifyService()
  }
}

const libp2p = createLibp2p(options)
const ipfs1 = await createHelia({ libp2p })
```

You may find IPFS is unable to connect to a local WebRTC relay. This is likely due to the local WebSockets transport being insecure (ws instead of wss). This issue should be solvable by passing the `all` filter to the `webSockets` function (remove this in production environments):

```
import { all } from '@libp2p/websockets/filters'

const ws = webSockets({ filter: all })
```

## Browser to Browser and Node Daemon to Browser

A connection cannot be made directly to a browser node. Browsers do not listen for incoming connections, they operate in a server/client environment where the server address is known and the browser connects to the server using the known address. Therefore, for a browser to respond to an incoming connection a relay is required to "listen" on the browser's behalf. The relay assigns and advertises multi addresses on behalf of the browser nodes, allowing the nodes to create a direct connection between each other.

Peer to peer connections where another peer connects to a browser node can use WebRTC as the transport protocol. A relay server is required to facilitate the discovery of a node and establish a direct connection to another node.

Details on how to [deploy a relay server](https://github.com/libp2p/js-libp2p-examples/tree/main/examples/js-libp2p-example-circuit-relay) are provided by the libp2p-examples project.

To connect two nodes via a relay, dial the relay from the first browser node. Once the first browser node's address is known, use this to dial the first browser node from the second browser node. 

In the first browser peer, dial the relay to discover the browser peer's address:

```javascript
// import the following libraries if using a build environment such as vite.
import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { yamux } from '@chainsafe/libp2p-yamux'
import { identifyService } from 'libp2p/identify'
import { webSockets } from '@libp2p/websockets'
import { webRTC } from '@libp2p/webrtc'
import { noise } from '@chainsafe/libp2p-noise'
import { circuitRelayTransport } from 'libp2p/circuit-relay'
import { multiaddr } from '@multiformats/multiaddr'
import { WebRTC as WebRTCMatcher } from '@multiformats/multiaddr-matcher'
import pRetry from 'p-retry'
import delay from 'delay'

const options = {
  addresses: {
    listen: [
      '/webrtc'
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
  streamMuxers: [yamux()],
  connectionGater: {
    denyDialMultiaddr: () => {
      return false
    }
  },
  services: {
    identify: identifyService()
  }
}

const libp2p = createLibp2p(options)
const ipfs1 = await createHelia({ libp2p })

/*The creation and deployment of a circuit relay is not covered in this documentation. However, you can use the one bundled with the OrbitDB unit tests by cloning the OrbitDB repository, installing the dependencies and then running `npm run webrtc` from the OrbitDB project's root dir. Once running, the webrtc relay server will print a number of addresses it is listening on. Use the address /ip4/127.0.0.1/tcp/12345/ws/p2p when specifying the relay for browser 1.
*/
const relay = '/ip4/127.0.0.1/tcp/12345/ws/p2p' // the address of the relay server. Change this if you are not using the OrbitDB-bundled webrtc relay.

await ipfs1.libp2p.dial(multiaddr(relay))

const a1 = await pRetry(async () => {
  const addr = ipfs1.libp2p.getMultiaddrs().filter(ma => WebRTCMatcher.matches(ma)).pop()

  if (addr == null) {
    await delay(10)
    throw new Error('No WebRTC address found')
  }

  return addr
})

console.log('ipfs1 address discovered: ', a1)
```

Configure the second browser node in the same way as the first, then dial in to the first browser peer using the "ipfs1 address discovered":

```javascript
// import the following libraries if using a build environment such as vite.
import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { yamux } from '@chainsafe/libp2p-yamux'
import { identifyService } from 'libp2p/identify'
import { webSockets } from '@libp2p/websockets'
import { webRTC } from '@libp2p/webrtc'
import { noise } from '@chainsafe/libp2p-noise'
import { circuitRelayTransport } from 'libp2p/circuit-relay'
import { multiaddr } from '@multiformats/multiaddr'
import { WebRTC as WebRTCMatcher } from '@multiformats/multiaddr-matcher'
import pRetry from 'p-retry'
import delay from 'delay'

const options = {
  addresses: {
    listen: [
      '/webrtc'
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
  streamMuxers: [yamux()],
  connectionGater: {
    denyDialMultiaddr: () => {
      return false
    }
  },
  services: {
    identify: identifyService()
  }
}

const libp2p = createLibp2p(options)
const ipfs1 = await createHelia({ libp2p })

const ipfs1Address = '' // paste the "ipfs1 address discovered:" value here.

await ipfs1.libp2p.dial(multiaddr(ipfs1Address))

const a2 = await pRetry(async () => {
  const addr = ipfs2.libp2p.getMultiaddrs().filter(ma => WebRTCMatcher.matches(ma)).pop()

  if (addr == null) {
    await delay(10)
    throw new Error('No WebRTC address found')
  }

  return addr
})

console.log('ipfs2 address discovered: ', a2)
```

## Further Reading

The js-libp2p library provides variety of [configuration options](https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md) for finding peers and connecting them to one another.

The different methods of connecting various systems is outlined in [libp2p's connectivity](https://connectivity.libp2p.io) section.