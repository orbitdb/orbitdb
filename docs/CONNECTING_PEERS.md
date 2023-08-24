# Connecting Peers

OrbitDB peers connect to one another using js-libp2p. Connection settings will vary depending on what environment the peer is running in and what system the peers is attempting to connect to.

## Node Daemon to Node Daemon

Node.js allows libp2p to open connections with other Node.js daemons.

```javascript
import { create } from 'ipfs-core'

const ipfs1 = await create({ repo: './ipfs1' })
const ipfs2 = await create({ repo: './ipfs2' })

const cid = await ipfs1.block.put('here is some data')
const block = await ipfs2.block.get(cid)
```

On localhost or a local network, both ipfs nodes should discover each other quickly enough so that ipfs2 will retrieve the block added to ipfs1.

In remote networks, retrieval of content across peers may take significantly longer. To speed up communication between the two peers, one peer can be directly connected to another using the swarm API and a peer's publicly accessible address. For example, assuming ipfs1 is listening on the address /ip4/1.2.3.4/tcp/12345/p2p/ipfs1-peer-hash:

```javascript
import { create } from 'ipfs-core'

const ipfs1 = await create({ repo: './ipfs1' })
const ipfs2 = await create({ repo: './ipfs2' })

await ipfs2.swarm.connect('/ip4/1.2.3.4/tcp/12345/p2p/ipfs1-peer-hash')

const cid = await ipfs1.block.put('here is some data')
const block = await ipfs2.block.get(cid)
```

## Browser to Node Daemon

For various security reasons, a browser cannot dial another peer over a raw TCP or QUIC connection from within a web page.  One option is to use a websocket exposed on the server and dial in via the browser.

On the server, listen for incoming websocket connections:

```javascript
import { webSockets } from '@libp2p/websockets'
import { create } from 'ipfs-core'

ipfs1 = await create({ 
  libp2p: { 
    addresses: {
      listen: [
        '/ip4/0.0.0.0/tcp/0/wss'
      ]
    },
    transports: [webSockets()] 
  },
  repo: './ipfs1'
})
```

Within the browser, dial into the server using the server's exposed web socket:

```javascript
// import the following libraries if using a build environment such as vite.
import { webSockets } from '@libp2p/websockets'
import { create } from 'ipfs-core'

const ws = new webSockets()

ipfs1 = await create({
  libp2p: {
    transports: [ws] 
  }},
  repo: './ipfs1'
})
```

You may find IPFS is unable to connect to a local WebRTC Star server. This will likely to due to the local WebSockets transport being insecure (ws instead of wss). To solve this issue, pass the `all` filter to the `webSockets` function:

```
import { all } from '@libp2p/websockets/filters'

const ws = webSockets({ filter: all })
```

## Browser to Browser and Node Daemon to Browser

A connection cannot be made directly to a browser node. Browsers do not listen for incoming connections, they operate in a server/client environment where the server address is known and the browser connects to the server using the known address. Therefore, for a browser to respond to an incoming connection a relay is required to "listen" on the browser's behalf. The relay assigns and advertises multi addresses on behalf of the browser nodes, allowing the nodes to create a direct connection between each other.

Peer to peer connections where another peer connects to a browser node can use WebRTC as the transport protocol. A signalling server is required to facilitate the discovery of a node and establish a direct connection to another node.

Details on how to [deploy a WebRTC signalling server](https://github.com/libp2p/js-libp2p-webrtc-star/tree/master/packages/webrtc-star-signalling-server) are provided by the libp2p project.

To connect two nodes via a relay, the IPFS swarm address should match the address of the signalling server.

In the first browser peer, configure

```javascript
import { create } from 'ipfs-core'
import { multiaddr } from 'multiaddr'

ipfs = await create({
  config: {
    Addresses: { 
      Swarm: ['/ip4/0.0.0.0/tcp/12345/ws/p2p-webrtc-star']
    }
  }
})
```

Configure the second browser node in the same way as the first, then dial in to the first browser peer using its multiaddress:

```javascript
import { create } from 'ipfs-core'
import { multiaddr } from 'multiaddr'

ipfs = await create({
  config: {
    Addresses: { 
      Swarm: ['/ip4/0.0.0.0/tcp/12345/ws/p2p-webrtc-star']
    }
  }
})

await ipfs.swarm.connect('/multiaddr/of/first-peer')
```

## Further Reading

The js-libp2p library provides variety of [configuration options](https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md) for finding peers and connecting them to one another.

The different methods of connecting various systems is outlined in [libp2p's connectivity](https://connectivity.libp2p.io) section.