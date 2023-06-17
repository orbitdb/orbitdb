# Databases

DB provides a variety of different data stores with a common interface.

## Types

OrbitDB provides four types of data stores:

- Events
- Documents
- Key/Value
- Indexed Key/Value

The type of database can be specified when calling OrbitDB's `open` function by using the `type` parameter:

```js
const type = 'documents'
orbitdb.open('my-db', { type })
```

If no type is specified, Events will the default database type.

## Address

When a database is created, it is assigned an address by OrbitDB. The address consists of three parts:

```
/orbitdb/zdpuAmrcSRUhkQcnRQ6p4bphs7DJWGBkqczSGFYynX6moTcDL
```

The first part, `/orbitdb`, specifies the protocol in use. The second part, an IPFS multihash `zdpuAmrcSRUhkQcnRQ6p4bphs7DJWGBkqczSGFYynX6moTcDL`, is the database manifest which contains the database info such as the name and type, and a pointer to the access controller.

In order to replicate the database with peers, the address is what you need to give to other peers in order for them to start replicating the database.

```js
import IPFS from 'ipfs-core'
import OrbitDB from 'orbit-db'

const ipfs = await IPFS.create()
const orbitdb = await OrbitDB({ ipfs })
const db = await orbitdb.open('my-db')
console.log(db.address)
// /orbitdb/zdpuAmrcSRUhkQcnRQ6p4bphs7DJWGBkqczSGFYynX6moTcDL
```

## Manifest

The second part of the address, the IPFS multihash `zdpuAmrcSRUhkQcnRQ6p4bphs7DJWGBkqczSGFYynX6moTcDL`, is also the hash of the database's manifest. The manifest contains information about the database such as name, type and other metadata. It also contains a reference to the access controller, which is made up of the type and the hash of the access controller object.

An example of a manifest is given below:

```json
{
  name: 'my-db',
  type: 'events',
  accessController: '/ipfs/zdpuB1TUuF5E81MFChDbRsZZ1A3Kz2piLJwKQ2ddnfZLEBx64'
}
```

The manifest is simply an [IPLD data structure](https://ipld.io/docs/) which can be retrived from IPFS just like any other hash:

```js
import { create } from 'ipfs-core'
import * as Block from 'multiformats/block'
import OrbitDB from 'orbit-db'

const ipfs = await create()

// Create the db then close.
const orbitdb = await OrbitDB({ ipfs })
const db = await orbitdb.open('my-db')
await db.close()

// Get the db address.
const addr = OrbitDBAddress(db.address)

// Extract the hash from the full db path.
const bytes = await ipfs.get(addr.path)

// Defines how we serialize/hash the data.
const codec = dagCbor
const hasher = sha256

// Retrieve the block data, decoding it to human-readable JSON text.
const { value } = await Block.decode({ bytes, codec, hasher })

console.log(value)
```

## Opening a new database

Opening a default event store:

```js
const orbitdb = await OrbitDB()
await orbitdb.open('my-db')
```

Opening a documents database:

```js
const orbitdb = await OrbitDB()
await orbitdb.open('my-db', { type: 'documents' })
```

Opening a keyvalue database:

```js
const orbitdb = await OrbitDB()
await orbitdb.open('my-db', { type: 'keyvalue' })
```

Opening a database and adding meta

```js
const meta = { description: 'A database with metadata.' }
const orbitdb = await OrbitDB()
await orbitdb.open('my-db', { meta })
```

## Loading an existing database

```js
const orbitdb = await OrbitDB()
const db = await orbitdb.open('my-db')
await db.close()
const dbReopened = await orbitdb.open(db.address)
```

## Interacting with a database

### Adding/Putting items in a database

Database types such as **documents** and **keyvalue** expose the `put` function which is used to add items as a key/value combination to the database.

```js
const orbitdb = await OrbitDB()
const db = await orbitdb.open('my-db', { type: keyvalue })
const hash = await db.put('key', 'value')
```

Alternatively, append-only database types such as **events** expose the `add` function which adds a value to the database:

```js
const orbitdb = await OrbitDB()
const db = await orbitdb.open('my-db')
const hash = await db.add('event')
```

### Removing/Deleting items from a database 

To delete an item from a database, use the `del` function:

```js
const orbitdb = await OrbitDB()
const db = await orbitdb.open('my-db', { type: keyvalue })
const hash = await db.put('key', 'value')
await db.del(hash)
```

## Replicating a database across peers

The power of OrbitDB lies in its ability to replicate databases across distributed systems that may not always be connected.

A simple replication process between two databases can be accomplished by listening for updates and iterating over the record set as those updates occur.

```js
import { create } from 'ipfs-core'
import { OrbitDB } from 'orbit-db'

const ipfs1 = await create({ config1, repo: './ipfs1' })
const ipfs2 = await create({ config2, repo: './ipfs2' })

orbitdb1 = await OrbitDB({ ipfs: ipfs1, id: 'user1', directory: './orbitdb1' })
orbitdb2 = await OrbitDB({ ipfs: ipfs2, id: 'user2', directory: './orbitdb2' })

const db1 = await orbitdb1.open('my-db')

await db1.add('hello world')

// Opening a db by address will start the synchronization process but only the 
// database heads will be synchronized.
const db2 = await orbitdb2.open(db1.address)

// We only have the heads of db1. To replicate all of db1's records, we will 
// need to iterate over db1's entire record set.
// We can determine when heads have been synchronized from db1 to db2 by 
// listening for the "update" event and iterating over the record set.  
db2.events.on('update', async (entry) => {
  for await (const record of db2.iterator()) {
    console.log(record)
  }
  // we can use the convenience function db.all() instead of iterating over 
  // db2's records.
  // await db2.all()
})
```

To learn more, check out [OrbitDB's sychronization protocol](https://orbitdb.org/api/module-Sync.html) and the [OrbitDB replication documentation](./REPLICATION.md).

## Building a custom database

OrbitDB can be extended to use custom or third party data stores. To implement a custom database, ensure the Database object is extended and that the OrbitDB database interface is implement. The database will also require a unique type.

```js
const CustomStore = async ({ OpLog, Database, ipfs, identity, address, name, access, directory, storage, meta, syncAutomatically, indexBy = '_id' }) => {
  const database = await Database({ OpLog, ipfs, identity, address, name, access, directory, storage, meta, syncAutomatically })

  const { addOperation, log } = database

  /**
   * Puts an item to the underlying database. You will probably want to call 
   * Database's addOperation here with an op code 'PUT'.
   */
  const put = async (doc) => {
  }

  /**
   * Deletes an item from the underlying database. You will probably want to
   * call Database's addOperation here with an op code 'DEL'.
   */
  const del = async (key) => {
  }

  /**
   * Gets an item from the underlying database. Use a hash or key to retrieve 
   * the value.
   */
  const get = async (key) => {
  }

  /**
   * Iterates over the data set.
   */
  const iterator = async function * ({ amount } = {}) {
  }

  return {
    ...database,
    type: 'customstore',
    put,
    del,
    get,
    iterator
  }
}
```

[Documents](../src/db/documents.js), [Events](../src/db/events.js) and [KeyValue](../src/db/keyvalue.js) provide good examples of how a database is implemented in OrbitDB.