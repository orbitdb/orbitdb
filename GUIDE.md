# Getting Started with OrbitDB

This guide will get you familiar with using OrbitDB in your JavaScript application. OrbitDB and IPFS both work in Node.js applications as well as in browser applications. (Windows is not supported yet though).

This guide is still being worked on and we would love to get [feedback and suggestions](https://github.com/orbitdb/orbit-db/issues) on how to improve it!

## Table of Contents

<!-- toc -->

- [Background](#background)
- [Install](#install)
- [API](#api)
- [Setup](#setup)
- [Create a database](#create-a-database)
  * [Address](#address)
    + [Manifest](#manifest)
  * [Identity](#identity)
    + [Creating an identity](#creating-an-identity)
  * [Access Control](#access-control)
    + [Public databases](#public-databases)
    + [Granting access after database creation](#granting-access-after-database-creation)
    + [Custom Access Controller](#custom-access-controller)
- [Add an entry](#add-an-entry)
- [Get an entry](#get-an-entry)
- [Entry sorting and conflict resolution](#entry-sorting-and-conflict-resolution)
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

```sh
npm install orbit-db ipfs
```

## API

See [API.md](https://github.com/orbitdb/orbit-db/blob/master/API.md) for the full documentation.

## Setup

Require OrbitDB and IPFS in your program and create the instances:

```javascript
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

async function main () {
  // Create IPFS instance
  const ipfsOptions = { repo : './ipfs', }
  const ipfs = await IPFS.create(ipfsOptions)

  // Create OrbitDB instance
  const orbitdb = await OrbitDB.createInstance(ipfs)
  }

main()
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
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

async function main () {
  // Create IPFS instance
  const ipfsOptions = { repo : './ipfs', }
  const ipfs = await IPFS.create(ipfsOptions)

  // Create OrbitDB instance
  const orbitdb = await OrbitDB.createInstance(ipfs)

  // Create database instance
  const db = await orbitdb.keyvalue('first-database')
}
main()
```

### Address

When a database is created, it will be assigned an address by OrbitDB. The address consists of three parts:
```
/orbitdb/Qmd8TmZrWASypEp4Er9tgWP4kCNQnW4ncSnvjvyHQ3EVSU/first-database
```

The first part, `/orbitdb`, specifies the protocol in use. The second part, an IPFS multihash `Qmd8TmZrWASypEp4Er9tgWP4kCNQnW4ncSnvjvyHQ3EVSU`, is the database manifest which contains the database info such as the name and type, and a pointer to the access controller. The last part, `first-database`, is the name of the database.

In order to replicate the database with peers, the address is what you need to give to other peers in order for them to start replicating the database.

The database address can be accessed as `db.address` from the database instance:
```javascript
const address = db.address
// address == '/orbitdb/Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC/first-database'
```

For example:
```javascript
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

async function main () {
  const ipfsOptions = { repo: './ipfs',}
  const ipfs = await IPFS.create(ipfsOptions)
  const orbitdb = await OrbitDB.createInstance(ipfs)
  const db = await orbitdb.keyvalue('first-database')
  console.log(db.address.toString())
  // /orbitdb/Qmd8TmZrWASypEp4Er9tgWP4kCNQnW4ncSnvjvyHQ3EVSU/first-database

}
main()
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

### Identity

Each entry in a database is signed by who created that entry. The identity, which includes the public key used to sign entries, can be accessed via the identity member variable of the database instance:

```javascript
const identity = db.identity
console.log(identity.toJSON())
// prints
{
  id: '0443729cbd756ad8e598acdf1986c8d586214a1ca9fa8c7932af1d59f7334d41aa2ec2342ea402e4f3c0195308a4815bea326750de0a63470e711c534932b3131c',
  publicKey: '0446829cbd926ad8e858acdf1988b8d586214a1ca9fa8c7932af1d59f7334d41aa2ec2342ea402e4f3c0195308a4815bea326750de0a63470e711c534932b3131c',
  signatures: {
    id: '3045022058bbb2aa415623085124b32b254b8668d95370261ade8718765a8086644fc8ae022100c736b45c6b2ef60c921848027f51020a70ee50afa20bc9853877e994e6121c15',
    publicKey: '3046022100d138ccc0fbd48bd41e74e40ddf05c1fa6ff903a83b2577ef7d6387a33992ea4b022100ca39e8d8aef43ac0c6ec05c1b95b41fce07630b5dc61587a32d90dc8e4cf9766'
  },
  type: 'orbitdb'
}
```


#### Creating an identity
```javascript
const Identities = require('orbit-db-identity-provider')
const options = { id: 'local-id' }
const identity = await Identities.createIdentity(options)
```
This identity can be used in OrbitDB by passing it in as an argument in the `options` object:
```javascript
const orbitdb = await OrbitDB.createInstance(ipfs, { identity: identity })
```
The identity also contains signatures proving possession of the id and OrbitDB public key. This is included to allow proof of ownership of an external public key within OrbitDB. You can read more [here](https://github.com/orbitdb/orbit-db-identity-provider)

The OrbitDB public key can be retrieved with:
```javascript
console.log(db.identity.publicKey)
// 04d009bd530f2fa0cda29202e1b15e97247893cb1e88601968abfe787f7ea03828fdb7624a618fd67c4c437ad7f48e670cc5a6ea2340b896e42b0c8a3e4d54aebe
```

If you want to give access to other peers to write to a database, you need to get their public key in hex and add it to the access controller upon creating the database. If you want others to give you the access to write, you'll need to give them your public key (output of `orbitdb.identity.publicKey`). For more information, see: [Access Control](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md#access-control).

### Access Control

You can specify the peers that have write-access to a database. You can define a set of peers that can write to a database or allow anyone write to a database. **By default and if not specified otherwise, only the creator of the database will be given write-access**.

***Note!*** *OrbitDB currently supports only dynamically adding write-access. That is, write-access cannot be revoked once added. In the future OrbitDB will support access revocation and read access control. At the moment, if access rights need to be removed, the address of the database will change.*

Access rights are setup by passing an `accessController` object that specifies the access-controller type and access rights of the database when created. OrbitDB currently supports write-access. The access rights are specified as an array of public keys of the peers who can write to the database. The public keys to which access is given can be retrieved from the identity.publicKey property of each peer.

```javascript
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

async function main () {
  const ipfsOptions = { repo: './ipfs',}
  const ipfs = await IPFS.create(ipfsOptions)
  const orbitdb = await OrbitDB.createInstance(ipfs)
  const options = {
    // Give write access to ourselves
    accessController: {
      write: [orbitdb.identity.id]
    }
  }

  const db = await orbitdb.keyvalue('first-database', options)
  console.log(db.address.toString())
  // /orbitdb/Qmd8TmZrWASypEp4Er9tgWP4kCNQnW4ncSnvjvyHQ3EVSU/first-database
}
main()
```

To give write access to another peer, you'll need to get their public key with some means. They'll need to give you the output of their OrbitDB instance's id: `orbitdb.identity.id`.

The keys look like this:
`042c07044e7ea51a489c02854db5e09f0191690dc59db0afd95328c9db614a2976e088cab7c86d7e48183191258fc59dc699653508ce25bf0369d67f33d5d77839`

Give access to another peer to write to the database:
```javascript
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

async function main () {
  const ipfsOptions = { repo: './ipfs', }
  const ipfs = await IPFS.create(ipfsOptions)
  const orbitdb = await OrbitDB.createInstance(ipfs)

  const options = {
    // Setup write access
    accessController: {
      write: [
        // Give access to ourselves
        orbitdb.identity.id,
        // Give access to the second peer
        '042c07044e7ea51a489c02854db5e09f0191690dc59db0afd95328c9db614a2976e088cab7c86d7e48183191258fc59dc699653508ce25bf0369d67f33d5d77839',
      ]
    }
  }

  const db1 = await orbitdb.keyvalue('first-database', options)
  console.log(db1.address.toString())
  // /orbitdb/Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC/first-database

  // Second peer opens the database from the address
  const db2 = await orbitdb.keyvalue(db1.address.toString())
}

main()
```

#### Public databases

The access control mechanism also support "public" databases to which anyone can write to.

This can be done by adding a `*` to the write access array:
```javascript
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

async function main () {
  const ipfsOptions = { repo: './ipfs', }
  const ipfs = await IPFS.create(ipfsOptions)
  const orbitdb = await OrbitDB.createInstance(ipfs)

  const options = {
    // Give write access to everyone
    accessController: {
      write: ['*']
    }
  }

  const db = await orbitdb.keyvalue('first-database', options)
  console.log(db.address.toString())
  // /orbitdb/QmRrauSxaAvNjpZcm2Cq6y9DcrH8wQQWGjtokF4tgCUxGP/first-database
}

main()
```

Note how the access controller hash is different compared to the previous example!

#### Granting access after database creation

To give access to another peer after the database has been created, you must set the access-controller `type` to an `AccessController` which supports dynamically adding write-access such as `OrbitDBAccessController`.

```javaScript
db = await orbitdb1.feed('AABB', {
  accessController: {
    type: 'orbitdb', //OrbitDBAccessController
    write: [identity1.publicKey]
  }
})

await db.access.grant('write', identity2.publicKey) // grant access to identity2
```

#### Custom Access Controller

You can create a custom access controller by implementing the `AccessController` [interface](https://github.com/orbitdb/orbit-db-access-controllers/blob/master/src/access-controller-interface.js) and adding it to the AccessControllers object before passing it to OrbitDB.

```javascript
let AccessControllers = require('orbit-db-access-controllers')
const AccessController = require('orbit-db-access-controllers/src/access-controller-interface')

class OtherAccessController extends AccessController {

    static get type () { return 'othertype' } // Return the type for this controller

    async canAppend(entry, identityProvider) {
      // logic to determine if entry can be added, for example:
      if (entry.payload === "hello world" && entry.identity.id === identity.id && identityProvider.verifyIdentity(entry.identity))
        return true

      return false
      }

    async grant (access, identity) {} // Logic for granting access to identity

    async save () {
      // return parameters needed for loading
      return { parameter: 'some-parameter-needed-for-loading' }
    }

    static async create (orbitdb, options) {
      return new OtherAccessController()
    }
}

AccessControllers.addAccessController({ AccessController: OtherAccessController })

const orbitdb = await OrbitDB.createInstance(ipfs, {
  AccessControllers: AccessControllers
})

const db = await orbitdb.keyvalue('first-database', {
  accessController: {
    type: 'othertype',
    write: [id1.id]
  }
})
```

## Add an entry

To add an entry to the database, we simply call `db.put(key, value)`.

```javascript
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

async function main () {
  const ipfsOptions = { repo: './ipfs'}
  const ipfs = await IPFS.create(ipfsOptions)
  const orbitdb = await OrbitDB.createInstance(ipfs)
  const db = await orbitdb.keyvalue('first-database')
  await db.put('name', 'hello')
}

main()
```

**NOTE ON PERSISTENCY**

OrbitDB does not automatically pin content added to IPFS. This means that if garbage collection is triggered, any unpinned content will be erased. To pin the entry, pass the optional `{ pin: true }` in the arguments:

```js
await db.put('name', 'hello', { pin: true })
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
async function main () {
  const ipfsOptions = { repo: './ipfs'}
  const ipfs = await IPFS.create(ipfsOptions)
  const orbitdb = await OrbitDB.createInstance(ipfs)
  const db = await orbitdb.keyvalue('first-database')
  await db.put('name', 'hello')
  const value = db.get('name')
}

main()
```

Other databases, see:
- [log.iterator()](https://github.com/orbitdb/orbit-db/blob/master/API.md#iteratoroptions)
- [feed.iterator()](https://github.com/orbitdb/orbit-db/blob/master/API.md#iteratoroptions-1)
- [docs.get()](https://github.com/orbitdb/orbit-db/blob/master/API.md#getkey-1)
- [docs.query()](https://github.com/orbitdb/orbit-db/blob/master/API.md#querymapper)
- [counter.value](https://github.com/orbitdb/orbit-db/blob/master/API.md#value)

## Entry sorting and conflict resolution

OrbitDB relies on [ipfs-log](https://github.com/orbitdb/ipfs-log) which sorts the entries based on a `sortFn` which determines the order. By default, the `sortFn` is set to [Last Writer Wins](https://github.com/orbitdb/ipfs-log/blob/1d609385f7c5db9926a0388cfcdf7fd2a796c522/src/log-sorting.js#L15) where the entry with the greater clock wins and conflicts are resolved by clock id.

You can pass a custom sorting function to handle conflicts differently as follows:

```javaScript
const db = await orbitdb.log('sortDifferently', {
  sortFn: SomeOtherSortFn
})
```

`SomeOtherSortFn` takes two entries and should return either `-1` or `1` indicating which of the arguments is greater. The function must not return `0` when comparing entries. See [Log Sorting](https://github.com/orbitdb/ipfs-log/blob/master/src/log-sorting.js#L15)

## Persistency

OrbitDB saves the state of the database automatically on disk. This means that upon opening a database, the developer can choose to load locally the persisted before using the database. **Loading the database locally before using it is highly recommended!**

```javascript
async function main () {
  const ipfsOptions = { repo: './ipfs'}
  const ipfs = await IPFS.create(ipfsOptions)
  const orbitdb = await OrbitDB.createInstance(ipfs)

  const db1 = await orbitdb.keyvalue('first-database')
  await db1.put('name', 'hello')
  await db1.close()

  const db2 = await orbitdb.keyvalue('first-database')
  await db2.load()
  const value = db2.get('name')
  // 'hello'
}

main()
```

If the developer doesn't call `load()`, the database will be operational but will not have the persisted data available immediately. Instead, OrbitDB will load the data on the background as new updates come in from peers.

## Replicating a database

In order to have the same data, ie. a query returns the same result for all peers, an OrbitDB database must be replicated between the peers. This happens automatically in OrbitDB in a way that a peer only needs to open an OrbitDB from an address and it'll start replicating the database.

To know when database was updated, we can listen for the `replicated` event of a database: `db2.events.on('replicated', () => ...)`. When the `replicated` event is fired, it means we received updates for the database from a peer. This is a good time to query the database for new results.

Replicate a database between two nodes:

```javascript
async function main() {
  // Create the first peer
  const ipfs1_config = { repo: './ipfs1', }
  const ipfs1 = await IPFS.create(ipfs1_config)

  // Create the database
  const orbitdb1 = await OrbitDB.createInstance(ipfs1, { directory: './orbitdb1' })
  const db1 = await orbitdb1.log('events')

  // Create the second peer
  const ipfs2_config = { repo: './ipfs2', }
  const ipfs2 = await IPFS.create(ipfs2_config)

  // Open the first database for the second peer,
  // ie. replicate the database
  const orbitdb2 = await OrbitDB.createInstance(ipfs2, { directory: './orbitdb2' })
  const db2 = await orbitdb2.log(db1.address.toString())

  console.log('Making db2 check replica')

  // When the second database replicated new heads, query the database
  db2.events.on('replicated', () => {
    const result = db2.iterator({ limit: -1 }).collect().map(e => e.payload.value)
    console.log(result.join('\n'))
  })

  // Start adding entries to the first database
  setInterval(async () => {
    await db1.add({ time: new Date().getTime() })
  }, 1000)

}

main()
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
let orbitdb = await OrbitDB.createInstance(ipfs, { directory: dbPath })
let store = orbitdb.create(name, CustomStore.type)
```

## More information

Is this guide missing something you'd like to understand or found an error? Please [open an issue](https://github.com/orbitdb/orbit-db/issues) and let us know what's missing!

Also, if you want a much more in-depth tutorial and exploration of OrbitDB's architecture, please check out the [OrbitDB Field Manual](https://github.com/orbitdb/field-manual).
