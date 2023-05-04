# DB

DB provides a variety of different data stores with a common interface.

## Types

OrbitDB provides four types of data stores:

- Events
- Documents
- Key/Value
- Indexed Key/Value

The type of database can be specified when calling OrbitDB's `open` function by using the `type` parameter:

```
const type = 'documents'
orbitdb.open('my-db', { type })
```

If no type is specified, Events will the default database type.

### Address

When a database is created, it is assigned an address by OrbitDB. The address consists of three parts:

```
/orbitdb/zdpuAmrcSRUhkQcnRQ6p4bphs7DJWGBkqczSGFYynX6moTcDL
```

The first part, `/orbitdb`, specifies the protocol in use. The second part, an IPFS multihash `zdpuAmrcSRUhkQcnRQ6p4bphs7DJWGBkqczSGFYynX6moTcDL`, is the database manifest which contains the database info such as the name and type, and a pointer to the access controller.

In order to replicate the database with peers, the address is what you need to give to other peers in order for them to start replicating the database.

```javascript
import IPFS from 'ipfs-core'
import OrbitDB from 'orbit-db'

const ipfs = await IPFS.create()
const orbitdb = await OrbitDB({ ipfs })
const db = await orbitdb.open('my-db')
console.log(db.address)
// /orbitdb/zdpuAmrcSRUhkQcnRQ6p4bphs7DJWGBkqczSGFYynX6moTcDL
```

### Manifest

The second part of the address, the IPFS multihash `zdpuAmrcSRUhkQcnRQ6p4bphs7DJWGBkqczSGFYynX6moTcDL`, is also the hash of the database's manifest. The manifest contains information about the database such as name, type and other metadata. It also contains a reference to the access controller, which is made up of the type and the hash of the access controller object.

An example of a manifest is given below:

```json
{
  hash: 'zdpuAzzxCWEzRffxFrxNNVkcVFbkmA1EQdpZJJPc3wpjojkAT',
  manifest: {
    name: 'my-db',
    type: 'events',
    accessController: '/ipfs/zdpuB1TUuF5E81MFChDbRsZZ1A3Kz2piLJwKQ2ddnfZLEBx64'
  }
}
```

## Operations

Operations are of either type "PUT" or "DEL". 

A PUT operation describes a record which has been created or edited. If operations share the same key or id, they are assumed to be related and the operation which was created after all other operations with the same key will be the latest version of the record.

A DEL operation describes a record which has been removed. It will share the same key as a previous PUT operation and will indicate that the record that was PUT is now deleted.

A PUT record might look like:

```
{
  id: 'log-1',
  payload: { op: 'PUT', key: 4, value: 'Some data' },
  next: [ '3' ],
  refs: [
    '2',
    '1'
  ],
  clock: Clock {
    id: '038cc50a92f10c39f74394a1779dffb2c79ddc6b7d1bbef8c484bd4bbf8330c426',
    time: 4
  },
  v: 2
}
```

In the above example, payload holds the information about the record. `op` is the operation carried out, in this case PUT (the other option is DEL). `key` holds a unique identifier for the record and value contains some data. In the above example, data is a string but it could be a number, XML or even the JSON representation of an object.

## Opening a new database

Opening a default event store:

```
const orbitdb = await OrbitDB()
await orbitdb.open('my-db')
```

Opening a documents database:

```
const orbitdb = await OrbitDB()
await orbitdb.open('my-db', { type: 'documents' })
```

Opening a keyvalue database:

```
const orbitdb = await OrbitDB()
await orbitdb.open('my-db', { type: 'keyvalue' })
```

Opening a database and adding meta

```
const meta = { description: 'A database with metadata.' }
const orbitdb = await OrbitDB()
await orbitdb.open('my-db', { meta })
```

## Loading an existing database

```
const orbitdb = await OrbitDB()
const db = await orbitdb.open('my-db')
db.close()
const dbReopened = await orbitdb.open(db.address)
```

## Interacting with a database

### Adding/Putting items in a database

All databases expose a common `put` function which is used to add items to the database.

```
const orbitdb = await OrbitDB()
const db = await orbitdb.open('my-db', { type: keyvalue })
const hash = await db.put('key', 'value')
```

For databases such as Events which is an append-only data store, a `null` key will need to be used:

```
const orbitdb = await OrbitDB()
const db = await orbitdb.open('my-db')
const hash = await db.put(null, 'event')
```

Alternatively, append-only databases can implement the convenience function `add`:

```
const orbitdb = await OrbitDB()
const db = await orbitdb.open('my-db')
const hash = await db.add('event')
```

### Removing/Deleting items from a database 

To delete an item from a databse, use the `del` function:

```
const orbitdb = await OrbitDB()
const db = await orbitdb.open('my-db', { type: keyvalue })
const hash = await db.put('key', 'value')
await db.del(hash)
```

## Replicating a database across peers

```
import * as IPFS from 'ipfs-core'

const ipfs1 = await IPFS.create({ config1, repo: './ipfs1' })
const ipfs2 = await IPFS.create({ config2, repo: './ipfs2' })

orbitdb1 = await OrbitDB({ ipfs: ipfs1, id: 'user1', directory: './orbitdb1' })
orbitdb2 = await OrbitDB({ ipfs: ipfs2, id: 'user2', directory: './orbitdb2' })

const db1 = await orbitdb1.open('my-db')
const db2 = await orbitdb2.open(db1.address)
```

## Building a custom database

OrbitDB can be extended to use custom or third party data stores. To implement a custom database, ensure the Database object is extended and that the OrbitDB database interface is implement. The database will also require a unique type.

```
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