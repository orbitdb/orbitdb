# Getting Started

This guide will help you get up and running with a simple OrbitDB database that you can replicate across multiple peers.

## install

Install OrbitDB:

```sh
npm i @orbitdb/core
```

You will also need Helia for replication:

```sh
npm i helia
```

## Prerequisites: Helia and Libp2p

OrbitDB uses Helia for block storage and Libp2p for database synchronization. However, you need to configure Helia and pass it to OrbitDB when creating a peer.

### Block Storage

Helia uses memory block storage by default. This means that storage is destroyed every time your application ends and OrbitDB will no longer be able to retrieve blocks from Helia. Therefore, it is necessary to configure Helia with permanent block storage. Helia comes with [a variety of storage solutions](https://github.com/ipfs-examples/helia-101#blockstore) including filesystem storage, IndexDB and Level. To add one of these storage mechanisms to Helia, install the relevant package:

```
npm i blockstore-level
```

then instantiate and pass to Helia:

```
import { LevelBlockstore } from 'blockstore-level'

const blockstore = new LevelBlockstore('./ipfs')
const ipfs = createHelia({ blockstore })
```

### Libp2p

OrbitDB synchronizes databases between peers using a p2p networking stack called [Libp2p](https://github.com/libp2p/js-libp2p/).

An instance of Libp2p is required by Helia which is then used by OrbitDB to synchronize database data across various networks.

A simple Node.js example might look something like:

```json
{
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
  streamMuxers: [yamux()],
  connectionGater: {
    denyDialMultiaddr: () => false
  },
  services: {
    identify: identify(),
    pubsub: gossipsub({ allowPublishToZeroPeers: true })
  }
}
```

You can export the above configuration from a file:

```js
export const Libp2pOptions = {
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
  streamMuxers: [yamux()],
  connectionGater: {
    denyDialMultiaddr: () => false
  },
  services: {
    identify: identify(),
    pubsub: gossipsub({ allowPublishToZeroPeers: true })
  }
} 
```

Throughout this documentation, you will see the above Libp2p configuration imported from a file called **./config/libp2p.js**, for example:

```js
import { Libp2pOptions } from './config/libp2p.js'
```

## Creating a standalone database

To create a database on a single machine, launch an instance of OrbitDB. Once launched, you can open a new database.

Assuming you have a Node.js development environment installed, create a new project using the command line:

```sh
mkdir orbitdb-app
cd orbitdb-app
npm init
```

Create a file in your project called index.js and add the following code to it:

```js
import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB } from '@orbitdb/core'
import { Libp2pOptions } from './config/libp2p.js'

// Create an IPFS instance.
const libp2p = await createLibp2p(Libp2pOptions)
const ipfs = await createHelia({ libp2p })

const orbitdb = await createOrbitDB({ ipfs })

const db = await orbitdb.open('my-db')

console.log('my-db address', db.address)

// Add some records to the db.
await db.add('hello world 1')
await db.add('hello world 2')

// Print out the above records.
console.log(await db.all())

// Close your db and stop OrbitDB and IPFS.
await db.close()
await orbitdb.stop()
await ipfs.stop()
```

Run index.js to create your new OrbitDB database:

```sh
node index.js
```

You should see the address of your new database and the records you have added
to it.

Without a type, OrbitDB defaults to a database type of 'events'. To change the database type, pass the `type` parameter with a valid database type.

Update:

```js
const db = await orbitdb.open('my-db')
```

to read:

```js
const db = await orbitdb.open('my-documents-db', { 'documents '})
```

Also replace:

```js
await db.add('hello world 1')
await db.add('hello world 2')
```

with:

```js
await db.put('doc1', { hello: "world 1", hits: 5 })
await db.put('doc2', { hello: "world 2", hits: 2 })
```

Run index.js again:

```sh
node index.js
```

You will have a new database of type 'documents'. Note that you can create all 
kinds of data stores using OrbitDB. The 'documents' database allows for more complex data types such as JSON.

## Replicating a database

OrbitDB's power lies in its ability to replicate data between peers distributed across multiple devices and networks; peers that may not always be connected.

To create an OrbitDB database peer, create a new project called `orbitdb-peer`:

```sh
mkdir orbitdb-peer
cd orbitdb-peer
npm init
```

Create a new file called index.js and paste in the following code:

```js
import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { OrbitDB, IPFSAccessController } from '@orbitdb/core'
import { Libp2pOptions } from './config/libp2p.js'

const main = async () => {  
  const libp2p = await createLibp2p(Libp2pOptions)
  const ipfs = await createHelia({ libp2p })

  // create a random directory to avoid OrbitDB conflicts.
  let randDir = (Math.random() + 1).toString(36).substring(2)

  const orbitdb = await createOrbitDB({ ipfs, directory: `./${randDir}/orbitdb` })

  let db

  if (process.argv[2]) {
    db = await orbitdb.open(process.argv[2])
  } else {
    // When we open a new database, write access is only available to the 
    // db creator. When replicating a database on a remote peer, the remote 
    // peer must also have write access. Here, we are simply allowing anyone 
    // to write to the database. A more robust solution would use the 
    // OrbitDBAccessController to provide "fine-grain" access using grant and 
    // revoke. 
    db = await orbitdb.open('my-db', { AccessController: IPFSAccessController({ write: ['*']})})
  }

  // Copy this output if you want to connect a peer to another.
  console.log('my-db address', db.address)

  // Add some records to the db when another peers joins.
  db.events.on('join', async (peerId, heads) => {
    await db.add('hello world 1')
    await db.add('hello world 2')
  })

  db.events.on('update', async (entry) => {
    console.log('entry', entry)
    
    // To complete full replication, fetch all the records from the other peer.
    await db.all()
  })

  // Clean up when stopping this app using ctrl+c
  process.on('SIGINT', async () => {
      // Close your db and stop OrbitDB and IPFS.
      await db.close()
      await orbitdb.stop()
      await ipfs.stop()

      process.exit()
  })
}

main()
```

Open two consoles in your command line terminal.

In terminal 1, run the first peer:

```sh
node index.js
```

When running, you should see the address of the database, for example:

```sh
my-db address /orbitdb/zdpuB2aYUCnZ7YUBrDkCWpRLQ8ieUbqJEVRZEd5aDhJBDpBqj
```

Copy the database's address from terminal 1 and, in terminal 2, run:

```sh
node index.js /orbitdb/zdpuB2aYUCnZ7YUBrDkCWpRLQ8ieUbqJEVRZEd5aDhJBDpBqj
```

Upon connection, you should see the records being created in terminal 1's database received by the database running in terminal 2.

## Further Reading

[Databases](./DATABASES.md) covers database management and data entry in more detail.

[Replication](./REPLICATION.md) provides a comprehensive overview of how to perform data replication across multiple peers.