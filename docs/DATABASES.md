# Databases

OrbitDB is a multi-model database which means various different types of data models can be used and custom data models can be created.

## Types

By default OrbitDB provides four types of databases:

- Events
- Documents
- Key/Value
- Indexed Key/Value

The type of database can be specified when calling OrbitDB's `open` function by using the `type` parameter:

```js
const type = 'documents'
orbitdb.open('my-db', { type })
```

If no type is specified, Events will the default database type. The type of a database, when created, is stored in the database's manifest. When opening a database, OrbitDB will read the type from the manifest and return the correct database type automatically.

## Address

When a database is created, it is assigned an address by OrbitDB. The address consists of three parts:

```
/orbitdb/zdpuAmrcSRUhkQcnRQ6p4bphs7DJWGBkqczSGFYynX6moTcDL
```

The first part, `/orbitdb`, specifies the protocol in use.

The second part, an IPFS multihash `zdpuAmrcSRUhkQcnRQ6p4bphs7DJWGBkqczSGFYynX6moTcDL`, is the database manifest which contains the database info such as the name and type, and a pointer to the access controller.

In order to replicate the database with peers, the address is what you need to give to other peers in order for them to start replicating the database.

```js
import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB, DefaultLibp2pOptions } from '@orbitdb/core'

const libp2p = await createLibp2p({ ...DefaultLibp2pOptions })
const ipfs = await createHelia({ libp2p })

const orbitdb = await createOrbitDB({ ipfs })
const db = await orbitdb.open('my-db')
console.log(db.address)
// /orbitdb/zdpuAmrcSRUhkQcnRQ6p4bphs7DJWGBkqczSGFYynX6moTcDL
```

## Manifest

The second part of the address, the IPFS multihash `zdpuAmrcSRUhkQcnRQ6p4bphs7DJWGBkqczSGFYynX6moTcDL`, is also the hash of the database's manifest. The manifest contains information about the database such as name, type and other metadata. It also contains a reference to the access controller, which is made up of the type and the hash of the access controller object.

An example of a manifest is given below:

```js
{
  name: 'my-db',
  type: 'events',
  accessController: '/ipfs/zdpuB1TUuF5E81MFChDbRsZZ1A3Kz2piLJwKQ2ddnfZLEBx64'
}
```

The manifest is an [IPLD data structure](https://ipld.io/docs/) which can be retrived from IPFS using the manifest's hash:

```js
import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import * as Block from 'multiformats/block'
import { createOrbitDB, OrbitDBAddress, DefaultLibp2pOptions } from '@orbitdb/core'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'

const libp2p = await createLibp2p({ ...DefaultLibp2pOptions })
const ipfs = await createHelia({ libp2p })

// Create the db then close.
const orbitdb = await createOrbitDB({ ipfs })
const db = await orbitdb.open('my-db')
await db.close()

// Get the db address.
const addr = OrbitDBAddress(db.address)
const cid = CID.parse(addr.path, base58btc)

// Extract the hash from the full db path.
const bytes = await ipfs.block.get(cid)

// Defines how we serialize/hash the data.
const codec = dagCbor
const hasher = sha256

// Retrieve the block data, decoding it to human-readable JSON text.
const { value } = await Block.decode({ bytes, codec, hasher })

console.log('manifest', value)
```

## Creating a new database

Creating a default event store:

```js
const orbitdb = await createOrbitDB()
await orbitdb.open('my-db')
```

Creating a documents database:

```js
const orbitdb = await createOrbitDB()
await orbitdb.open('my-db', { type: 'documents' })
```

Creating a keyvalue database:

```js
const orbitdb = await createOrbitDB()
await orbitdb.open('my-db', { type: 'keyvalue' })
```

Creating a database and adding meta

```js
const meta = { description: 'A database with metadata.' }
const orbitdb = await createOrbitDB()
await orbitdb.open('my-db', { meta })
```

## Opening an existing database

```js
const orbitdb = await createOrbitDB()
const db = await orbitdb.open('my-db')
await db.close()
const dbReopened = await orbitdb.open(db.address)
```

## Interacting with a database

### Adding/Putting items in a database

Database types such as **documents** and **keyvalue** expose the `put` function which is used to add items as a key/value combination to the database.

```js
const orbitdb = await createOrbitDB()
const db = await orbitdb.open('my-db', { type: 'keyvalue' })
const hash = await db.put('key', 'value')
```

Alternatively, append-only database types such as **events** expose the `add` function which adds a value to the database:

```js
const orbitdb = await createOrbitDB()
const db = await orbitdb.open('my-db')
const hash = await db.add('event')
```

### Removing/Deleting items from a database 

To delete an item from a database, use the `del` function:

```js
const orbitdb = await createOrbitDB()
const db = await orbitdb.open('my-db', { type: 'keyvalue' })
const hash = await db.put('key', 'value')
await db.del(hash)
```

## Replicating a database across peers

The power of OrbitDB lies in its ability to replicate databases across distributed systems that may not always be connected.

A simple way to replicate a database between peers can be accomplished by opening a database, listening for updates and iterating over the records as those updates occur.

```js
import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB } from '@orbitdb/core'

const initIPFSInstance = () => {
  const libp2p = await createLibp2p({ ...DefaultLibp2pOptions })
  return createHelia({ libp2p })
}

const ipfs1 = await initIPFSInstance()
const ipfs2 = await initIPFSInstance()

orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'user1', directory: './orbitdb1' })
orbitdb2 = await createOrbitDB({ ipfs: ipfs2, id: 'user2', directory: './orbitdb2' })

const db1 = await orbitdb1.open('my-db')

await db1.add('hello world')

// Opening a db by address will start the synchronization process but only the 
// database heads will be synchronized.
const db2 = await orbitdb2.open(db1.address)

// We only have the latest record of db1. To replicate all of db1's records, we will 
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

## Custom databases

OrbitDB can be extended to use custom data models and database types. To implement a custom database, ensure the Database object is extended and that the OrbitDB database interface is implement. The database will also require a unique type.

```js
const type = 'customdb'

const CustomDB = async ({ OpLog, Database, ipfs, identity, address, name, access, directory, storage, meta, syncAutomatically }) => {
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
    type,
    put,
    del,
    get,
    iterator
  }
}

CustomDB.type = type

export default CustomDB
```

[Documents](../src/db/documents.js), [Events](../src/db/events.js) and [KeyValue](../src/db/keyvalue.js) provide good examples of how a database is implemented in OrbitDB and how to add the logic for returning records from the database (the state of the database).

To use a custom database, add it to the list of supported database types:

```js
import { createOrbitDB, useDatabaseType } from '@orbitdb/core'
import CustomDB from './custom-db.js'

useDatabaseType(CustomDB)
const orbitdb = await createOrbitDB()
await orbitdb.open('my-custom-db', { type: 'customdb' })
```

