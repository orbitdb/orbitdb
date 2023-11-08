# Getting Started

This guide will help you get up and running with a simple OrbitDB database that you can replicate across multiple peers.

## install

Install OrbitDB:

```sh
npm i @orbitdb/core
```

You will also need IPFS for replication:

```sh
npm i ipfs-core
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
import { createOrbitDB } from '@orbitdb/core'
import { create } from 'ipfs-core'

// Create an IPFS instance with defaults.
const ipfs = await create()

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
import { OrbitDB, IPFSAccessController } from '@orbitdb/core'
import { create } from 'ipfs-core'

const main = async () => {
  // create a random directory to avoid IPFS and OrbitDB conflicts.
  let randDir = (Math.random() + 1).toString(36).substring(2)

  const config = {
    Addresses: {
      API: '/ip4/127.0.0.1/tcp/0',
      Swarm: ['/ip4/0.0.0.0/tcp/0'],
      Gateway: '/ip4/0.0.0.0/tcp/0'
    }
  }
  
  // This will create an IPFS repo in ./[randDir]/ipfs.
  const ipfs = await create({ config, repo: './' + randDir + '/ipfs'})

  // This will create all OrbitDB-related databases (keystore, my-db, etc) in 
  // ./[randDir]/ipfs.
  const orbitdb = await createOrbitDB({ ipfs, directory: './' + randDir + '/orbitdb' })

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