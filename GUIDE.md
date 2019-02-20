# Getting Started with OrbitDB

This guide will get you familiar with using OrbitDB in your JavaScript application. OrbitDB and IPFS both work in Node.js applications as well as in browser applications. (Windows is not supported yet though).

This guide is still being worked on and we would love to get [feedback and suggestions](https://github.com/orbitdb/orbit-db/issues) on how to improve it!

## Table of Contents

<!-- toc -->

- [Background](#background)
- [Install](#install)
- [Setup](#setup)
- [Create a database](#create-a-database)
  * [Address](#address)
    + [Manifest](#manifest)
  * [Keys](#keys)
  * [Access Control](#access-control)
    + [Public databases](#public-databases)
- [Add an entry](#add-an-entry)
- [Get an entry](#get-an-entry)
- [Persistency](#persistency)
- [Replicating a database](#replicating-a-database)
- [Custom Stores](#custom-stores)
- [More information](#more-information)

<!-- tocstop -->

## Background

OrbitDB is a peer-to-peer database meaning that each peer has its own instance of a specific database. A database is replicated between the peers automatically resulting in an up-to-date view of the database upon updates from any peer. That is to say, the database gets pulled to the clients.

This means that each application contains the full database that they're using. This in turn changes the data modeling as compared to client-server model where there's usually one big database for all entries: in OrbitDB, the data should be stored, "partitioned" or "sharded" based on the access rights for that data. For example, in a twitter-like application, tweets would not be saved in a global "tweets" database to which millions of users write concurrently, but rather, ***each user would have their own database*** for their tweets. To follow a user, a peer would subscribe to a user's feed, ie. replicate their feed database.

OrbitDB supports multiple data models (see more details below) and as such the developer has a variety of ways to structure data. Combined with the peer-to-peer paradigm, the data modeling is important factor to build scalable decentralized applications.

This may not be intuitive or you might not be sure what the best approach would be and we'd be happy to help you decide on your data modeling and application needs, [feel free to reach out](https://github.com/orbitdb/orbit-db/issues)!

## Install

Install [orbit-db](https://github.com/orbitdb/orbit-db) and [ipfs](https://www.npmjs.com/package/ipfs) from npm:

```
npm install orbit-db ipfs
```

## Setup

Require OrbitDB and IPFS in your program and create the instances:

```javascript
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

// OrbitDB uses Pubsub which is an experimental feature
// and need to be turned on manually.
// Note that these options need to be passed to IPFS in
// all examples in this document even if not specified so.
const ipfsOptions = {
  EXPERIMENTAL: {
    pubsub: true
  }
}

// Create IPFS instance
const ipfs = new IPFS(ipfsOptions)

ipfs.on('ready', () => {
  // Create OrbitDB instance
  const orbitdb = new OrbitDB(ipfs)
})
```

`orbitdb` is now the OrbitDB instance we can use to interact with the databases.

## Create a database

First, choose the data model you want to use. The available data models are:
- [Key-Value](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbkeyvaluenameaddress)
- [Log](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdblognameaddress) (append-only log)
- [Feed](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbfeednameaddress) (same as log database but entries can be removed)
- [Documents](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbdocsnameaddress-options) (store indexed JSON documents)
- [Counters](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbcounternameaddress)

Then, create a database instance (we'll use Key-Value database in this example):

```javascript
const ipfs = new IPFS()
ipfs.on('ready', async () => {
  const orbitdb = new OrbitDB(ipfs)
  const db = await orbitdb.keyvalue('first-database')
})
```

### Address

When a database is created, it will be assigned an address by OrbitDB. The address consists of three parts:
```
/orbitdb/Qmd8TmZrWASypEp4Er9tgWP4kCNQnW4ncSnvjvyHQ3EVSU/first-database
```

The first part, `/orbitdb`, specifies the protocol in use. The second part, an IPFS multihash `Qmd8TmZrWASypEp4Er9tgWP4kCNQnW4ncSnvjvyHQ3EVSU`, is the database manifest which contains the database info such as the name and type, and a pointer to the access controller. The last part, `first-database`, is the name of the database.

In order to replicate the database with peers, the address is what you need to give to other peers in order for them to start replicating the database.

The database address can be accessed as `db.address` from the database instance:
```
const address = db.address
// address == '/orbitdb/Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC/first-database'
```

For example:
```javascript
const ipfs = new IPFS()
ipfs.on('ready', async () => {
  const orbitdb = new OrbitDB(ipfs)
  const db = await orbitdb.keyvalue('first-database')
  console.log(db.address.toString())
  // /orbitdb/Qmd8TmZrWASypEp4Er9tgWP4kCNQnW4ncSnvjvyHQ3EVSU/first-database
})
```

#### Manifest

The second part of the address, the IPFS multihash `Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC`, is the manifest of a database. It's an IPFS object that contains information about the database.

The database manifest can be fetched from IPFS and it looks like this:

```json
{
  "Data": "{\"name\":\"a\",\"type\":\"feed\",\"accessController\":\"/ipfs/QmdjrCN7SqGxRapsm6LuoS4HrWmLeQHVM6f1Zk5A3UveqA\"}",
  "Hash": "Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC",
  "Size": 102,
  "Links": []
}
```

### Keys

Each entry in a database is signed by who created that entry. The signing key, the key that a peer uses to sign entries, can be accessed as a member variable of the database instance:

```
const key = db.key
console.log(key)
// <Key priv: db8ef129f3d26ac5d7c17b402027488a8f4b2e7fa855c27d680b714cf9c1f87e
// pub: <EC Point x: f0e33d60f9824ce10b2c8983d3da0311933e82cf5ec9374cd82c0af699cbde5b
// y: ce206bfccf889465c6g6f9a7fdf452f9c3e1204a6f1b4582ec427ec12b116de9> >
```

The key contains the keypair used to sign the database entries. The public key can be retrieved with:
```
console.log(db.key.getPublic('hex'))
// 04d009bd530f2fa0cda29202e1b15e97247893cb1e88601968abfe787f7ea03828fdb7624a618fd67c4c437ad7f48e670cc5a6ea2340b896e42b0c8a3e4d54aebe
```

The key can also be accessed from the OrbitDB instance: `orbitdb.key.getPublic('hex')`.

If you want to give access to other peers to write to a database, you need to get their public key in hex and add it to the access controller upon creating the database. If you want others to give you the access to write, you'll need to give them your public key (output of `orbitdb.key.getPublic('hex')`). For more information, see: [Access Control](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md#access-control).

### Access Control

You can specify the peers that have write-access to a database. You can define a set of peers that can write to a database or allow anyone write to a database. **By default and if not specified otherwise, only the creator of the database will be given write-access**.

***Note!*** *OrbitDB currently supports only write-access and the keys of the writers need to be known when creating a database. That is, the access rights can't be changed after a database has been created. In the future we'll support read access control and dynamic access control in a way that access rights can be added and removed to a database at any point in time without changing the database address. At the moment, if access rights need to be changed, the address of the database will change.*

Access rights are setup by passing an `access` object that defines the access rights of the database when created. OrbitDB currently supports write-access. The access rights are specified as an array of public keys of the peers who can write to the database.

```javascript
const ipfs = new IPFS()
ipfs.on('ready', async () => {
  const orbitdb = new OrbitDB(ipfs)

  const access = {
    // Give write access to ourselves
    write: [orbitdb.key.getPublic('hex')],
  }

  const db = await orbitdb.keyvalue('first-database', access)
  console.log(db.address.toString())
  // /orbitdb/Qmd8TmZrWASypEp4Er9tgWP4kCNQnW4ncSnvjvyHQ3EVSU/first-database
})
```

To give write access to another peer, you'll need to get their public key with some means. They'll need to give you the output of their OrbitDB instance's key: `orbitdb.key.getPublic('hex')`.

The keys look like this:
`042c07044e7ea51a489c02854db5e09f0191690dc59db0afd95328c9db614a2976e088cab7c86d7e48183191258fc59dc699653508ce25bf0369d67f33d5d77839`

Give access to another peer to write to the database:
```javascript
const ipfs = new IPFS()
ipfs.on('ready', async () => {
  const orbitdb = new OrbitDB(ipfs)

  const access = {
    // Setup write access
    write: [
      // Give access to ourselves
      orbitdb.key.getPublic('hex'),
      // Give access to the second peer
      '042c07044e7ea51a489c02854db5e09f0191690dc59db0afd95328c9db614a2976e088cab7c86d7e48183191258fc59dc699653508ce25bf0369d67f33d5d77839',
    ],
  }

  const db1 = await orbitdb.keyvalue('first-database', access)
  console.log(db1.address.toString())
  // /orbitdb/Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC/first-database

  // Second peer opens the database from the address
  const db2 = await orbitdb.keyvalue(db1.address.toString())
})
```

#### Public databases

The access control mechanism also support "public" databases to which anyone can write to.

This can be done by adding a `*` to the write access array:
```javascript
const ipfs = new IPFS()
ipfs.on('ready', async () => {
  const orbitdb = new OrbitDB(ipfs)

  const access = {
    // Give write access to everyone
    write: ['*'],
  }

  const db = await orbitdb.keyvalue('first-database', access)
  console.log(db.address.toString())
  // /orbitdb/QmRrauSxaAvNjpZcm2Cq6y9DcrH8wQQWGjtokF4tgCUxGP/first-database
})
```

Note how the access controller hash is different compared to the previous example!

## Add an entry

To add an entry to the database, we simply call `db.put(key, value)`.

```javascript
const ipfs = new IPFS()
ipfs.on('ready', async () => {
  const orbitdb = new OrbitDB(ipfs)
  const db = await orbitdb.keyvalue('first-database')
  await db.put('name', 'hello')
})
```

For adding entries to other databases, see:
- [log.add()](https://github.com/orbitdb/orbit-db/blob/master/API.md#addevent)
- [feed.add()](https://github.com/orbitdb/orbit-db/blob/master/API.md#adddata)
- [docs.put()](https://github.com/orbitdb/orbit-db/blob/master/API.md#putdoc)
- [counter.inc()](https://github.com/orbitdb/orbit-db/blob/master/API.md#incvalue)

**Parallelism**

We currently don't support parallel updates. Updates to a database need to be executed in a sequential manner. The write throughput is several hundreds or thousands of writes per second (depending on your platform and hardware, YMMV), so this shouldn't slow down your app too much. If it does, [lets us know](https://github.com/orbitdb/orbit-db/issues)!

Update the database one after another:
```javascript
await db.put('key1', 'hello1')
await db.put('key2', 'hello2')
await db.put('key3', 'hello3')
```

Not:
```javascript
// This is not supported atm!
Promise.all([
  db.put('key1', 'hello1'),
  db.put('key2', 'hello2'),
  db.put('key3', 'hello3')
])
```

## Get an entry

To get a value or entry from the database, we call the appropriate query function which is different per database type.

Key-Value:
```javascript
const ipfs = new IPFS()
ipfs.on('ready', async () => {
  const orbitdb = new OrbitDB(ipfs)
  const db = await orbitdb.keyvalue('first-database')
  await db.put('name', 'hello')
  const value = db.get('name')
})
```

Other databases, see:
- [log.iterator()](https://github.com/orbitdb/orbit-db/blob/master/API.md#iteratoroptions)
- [feed.iterator()](https://github.com/orbitdb/orbit-db/blob/master/API.md#iteratoroptions-1)
- [docs.get()](https://github.com/orbitdb/orbit-db/blob/master/API.md#getkey-1)
- [docs.query()](https://github.com/orbitdb/orbit-db/blob/master/API.md#querymapper)
- [counter.value](https://github.com/orbitdb/orbit-db/blob/master/API.md#value)

## Persistency

OrbitDB saves the state of the database automatically on disk. This means that upon opening a database, the developer can choose to load locally the persisted before using the database. **Loading the database locally before using it is highly recommended!**

```javascript
const ipfs = new IPFS()
ipfs.on('ready', async () => {
  const orbitdb = new OrbitDB(ipfs)

  const db1 = await orbitdb.keyvalue('first-database')
  await db1.put('name', 'hello')
  await db1.close()

  const db2 = await orbitdb.keyvalue('first-database')
  await db2.load()
  const value = db2.get('name')
  // 'hello'
})
```

If the developer doesn't call `load()`, the database will be operational but will not have the persisted data available immediately. Instead, OrbitDB will load the data on the background as new updates come in from peers.

## Replicating a database

In order to have the same data, ie. a query returns the same result for all peers, an OrbitDB database must be replicated between the peers. This happens automatically in OrbitDB in a way that a peer only needs to open an OrbitDB from an address and it'll start replicating the database.

To know when database was updated, we can listen for the `replicated` event of a database: `db2.events.on('replicated', () => ...)`. When the `replicated` event is fired, it means we received updates for the database from a peer. This is a good time to query the database for new results.

Replicate a database between two nodes:

```javascript
// Create the first peer
const ipfs1 = new IPFS({ repo: './ipfs1' })
ipfs1.on('ready', async () => {
  // Create the database
  const orbitdb1 = new OrbitDB(ipfs1, './orbitdb1')
  const db1 = await orbitdb1.log('events')

  // Create the second peer
  const ipfs2 = new IPFS({ repo: './ipfs2' })
  ipfs2.on('ready', async () => {
    // Open the first database for the second peer,
    // ie. replicate the database
    const orbitdb2 = new OrbitDB(ipfs2, './orbitdb2')
    const db2 = await orbitdb2.log(db1.address.toString())

    // When the second database replicated new heads, query the database
    db2.events.on('replicated', () => {
      const result = db2.iterator({ limit: -1 }).collect().map(e => e.payload.value)
      console.log(result.join('\n'))
    })

    // Start adding entries to the first database
    setInterval(async () => {
      await db1.add({ time: new Date().getTime() })
    }, 1000)
  })
})
```

## Custom Stores

Use a custom store to implement case specific functionality that is not supported by the default OrbitDB database stores. Then, you can easily add and use your custom store with OrbitDB:

```javascript
// define custom store type
class CustomStore extends DocumentStore {
  constructor (ipfs, id, dbname, options) {
    super(ipfs, id, dbname, options)
    this._type = CustomStore.type
  }

  static get type () {
    return 'custom'
  }
}

// add custom type to orbitdb
OrbitDB.addDatabaseType(CustomStore.type, CustomStore)

// instantiate custom store
let orbitdb = new OrbitDB(ipfs, dbPath)
let store = orbitdb.create(name, CustomStore.type)
```

## More information

Is this guide missing something you'd like to understand or found an error? Please [open an issue](https://github.com/orbitdb/orbit-db/issues) and let us know what's missing!
