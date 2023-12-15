# Replication

Below is a simple replication example. Both peers run within the same Nodejs process.

```js
import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB } from '@orbitdb/core'

// Our ipfs instances will be connecting over websockets. However, you could achieve the same here using tcp. You can find out more about peer connectivity at https://connectivity.libp2p.io/.

const initIPFSInstance = () => {
  const libp2p = await createLibp2p({ ...DefaultLibp2pOptions })
  return createHelia({ libp2p })
}

const ipfs1 = await initIPFSInstance()
const ipfs2 = await initIPFSInstance()

// The decentralized nature if IPFS can make it slow for peers to find one 
// another. You can speed up a connection between two peers by "dialling-in"
// to one peer from another.
/* 
await ipfs2.libp2p.save(ipfs1.libp2p.peerId, { multiaddr: ipfs1.libp2p.getMultiaddrs() })
await ipfs2.libp2p.dial(ipfs1.libp2p.peerId)
*/

const orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'userA', directory: './orbitdb/1' })
const orbitdb2 = await createOrbitDB({ ipfs: ipfs2, id: 'userB', directory: './orbitdb/2' })

// This opens a new db. Default db type will be 'events'.
const db1 = await orbitdb1.open('my-db')

// We connect to the first db using its address. This initiates a
// synchronization of the heads between db1 and db2.
const db2 = await orbitdb2.open(db1.address)

// We write some data to db1. This will not be replicated on db2 until we 
// explicitly request these records using db2's iterator or all() convenience 
// function.
await db1.add('hello world 1')
await db1.add('hello world 2')
await db1.add('hello world 3')
await db1.add('hello world 4')

let db2Updated = false

// Listen for the connection of ipfs1 to ipfs2.
// If we want to listen for connections from ipfs2 to ipfs1, add a "join" 
// listener to db1.
db2.events.on('join', async (peerId, heads) => {
  // The peerId of the ipfs1 node.
  console.log(peerId, (await ipfs1.id()).id)
})

// Listen for any updates to db2. This is especially useful when listening for 
// new heads that are available on db1.
// If we want to listen for new data on db2, add an "update" listener to db1.
db2.events.on('update', async (entry) => {
  console.log(await db2.all())
  db2Updated = true
})

// wait for db2 to complete updating.
await new Promise((resolve, reject) => {
  setInterval(() => {
    if (db2Updated) {
      resolve()
    }
  }, 1000)
})

// Close db1 and its underlying ipfs peer.
await db1.close()
await orbitdb1.stop()
await ipfs1.stop()

// Close db2 and its underlying ipfs peer.
await db2.close()
await orbitdb2.stop()
await ipfs2.stop()
```

Refer to the API for more information about [OrbitDB's synchronization protocol](https://orbitdb.org/api/module-Sync.html).
