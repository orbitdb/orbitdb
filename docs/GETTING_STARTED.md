# Getting Started

This guide will help you get up and running with a simple OrbitDB database that you can replicate across multiple peers.

## install

Install OrbitDB:

```
npm i orbit-db
```

You will also need IPFS for replication:

```
npm i ipfs-core
```

## Creating a simple database

To create a database, launch an instance of OrbitDB call the `open` function with a unique database name: 

```
const ipfs = await IPFS.create()
const orbitdb = await OrbitDB({ ipfs })
const db = await orbitdb.open('my-db')
```

Once opened, your new database will reside on the system it was created on.

Without a type, OrbitDB defaults to a database type of 'events'. To change the database type, pass a `type` with a valid database type:

```
const type = 'documents'
const ipfs = await IPFS.create()
const orbitdb = await OrbitDB({ ipfs })
const db = await orbitdb.open('my-db', { type })
```

## Replicating a database

A database created on one peer can be replicated on another by opening the database by its address rather than by its name:

```
const address = '/orbitdb/zdpuAzzxCWEzRffxFrxNNVkcVFbkmA1EQdpZJJPc3wpjojkAT'
const ipfs = await IPFS.create()
const orbitdb = await OrbitDB({ ipfs })
const db = await db.open(address)
```

IPFS is required for carrying out the underlying replication.

More information about replication is available in the [Replication](./REPLICATION.md) documentation.

## Further Reading

The [Databases](./DATABASES.md) documentation covers replication and data entry in more detail.