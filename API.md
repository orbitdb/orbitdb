# orbit-db API documentation

OrbitDB provides various types of databases for different data models: 
- [log](#lognameaddress) is an append-only log with traversable history. Useful for *"latest N"* use cases or as a message queue.
- [feed](#feednameaddress) is a log with traversable history. Entries can be added and removed. Useful for *"shopping cart" type of use cases, or for example as a feed of blog posts or "tweets".
- [keyvalue](#keyvaluenameaddress) is a key-value database just like your favourite key-value database.
- [docs](#docsnameaddress-options) is a document database to which documents can be stored and indexed by a specified key. Useful for example building search indices or version controlling documents and data.
- [counter](#counternameaddress) for counting. Useful for example counting events separate from log/feed data.

Which database to use depends on your use case and data model.

## Usage

Read the **[GETTING STARTED](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md)** guide for a more in-depth tutorial and to understand how OrbitDB works.

### Using as a module

Install [orbit-db](https://www.npmjs.com/package/orbit-db) and [ipfs](https://www.npmjs.com/package/ipfs) from npm:

```
npm install orbit-db ipfs
```

Require it in your program and create the instance:

```javascript
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

const ipfs = new IPFS()
ipfs.on('ready', () => {
  const orbitdb = new OrbitDB(ipfs)

  // Create / Open a database
  const db = await orbitdb.log('hello')
  await db.load()

  // Listen for updates from peers
  db.events.on('replicated', (address) => {
    console.log(db.iterator({ limit: -1 }).collect())
  })

  // Add an entry
  const hash = await db.add('world')
  console.log(hash)
  
  // Query
  const result = db.iterator({ limit: -1 }).collect()
  console.log(result)
})
```

`orbitdb` is now the [OrbitDB](#orbitdb) instance we can use to interact with the databases.

This will tell `orbit-db` to use the [Javascript implementation](https://github.com/ipfs/js-ipfs) of IPFS. Choose this options if you're using `orbitd-db` to develop **browser** applications.

### Using with a running IPFS daemon
Alternatively, you can use [ipfs-api](https://npmjs.org/package/ipfs-api) to use `orbit-db` with a locally running IPFS daemon:

```
npm install orbit-db ipfs-api
```

```javascript
const IpfsApi = require('ipfs-api')
const OrbitDB = require('orbit-db')

const ipfs = IpfsApi('localhost', '5001')
const orbitdb = new OrbitDB(ipfs)
const db = await orbitdb.log('hello')
...
```

`orbitdb` is now the [OrbitDB](#orbitdb) instance we can use to interact with the databases.

Choose this options if you're using `orbitd-db` to develop **backend** or **desktop** applications, eg. with [Electron](https://electron.atom.io).


## API

- [OrbitDB](#orbitdb)
  - [constructor(ipfs, [directory], [options])](#constructoripfs-directory-options)
  - [keyvalue(name|address)](#keyvaluenameaddress)
    - [put(key, value)](#putkey-value)
    - [set(key, value)](#setkey-value)
    - [get(key)](#getkey)
  - [log(name|address)](#lognameaddress)
    - [add(event)](#addevent)
    - [get(hash)](#gethash)
    - [iterator([options])](#iteratoroptions)
  - [feed(name|address)](#feednameaddress)
    - [add(data)](#adddata)
    - [get(hash)](#gethash-1)
    - [remove(hash)](#removehash)
    - [iterator([options])](#iteratoroptions)
  - [docs(name|address, options)](#docsnameaddress-options)
    - [put(doc)](#putdoc)
    - [get(hash)](#getkey-1)
    - [query(mapper)](#querymapper)
    - [del(key)](#delkey)
  - [counter(name|address)](#counternameaddress)
    - [value](#value)
    - [inc([value])](#incvalue)
  - [stop()](#stop)
- [Store](#store)
  - [load()](#load)
  - [close()](#close)
  - [drop()](#drop)
  - [events](#events)
  - [key](#key)
  - [type](#type)

## OrbitDB

### constructor(ipfs, [directory], [options])

```javascript
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

const ipfs = new IPFS()
ipfs.on('ready', () => {
  const orbitdb = new OrbitDB(ipfs)
})
```

After creating an `OrbitDB` instance , you can access the different data stores. Creating a database instance, eg. with `orbitdb.keyvalue(...)`, returns a *Promise* that resolves to a [database instance](#store). See the [Store](#store) section for details of common methods and properties.

```javascript
const db = await orbitdb.kvstore('profile')
```

### keyvalue(name|address)

Module: [orbit-db-kvstore](https://github.com/orbitdb/orbit-db-kvstore)

```javascript
const db = await orbitdb.keyvalue('application.settings')
// Or:
const db = await orbitdb.keyvalue(anotherkvdb.address)
```

**See the [Store](#store) section for details of common methods and properties.**

#### put(key, value)
  ```javascript
  await db.put('hello', { name: 'World' })
  ```

#### set(key, value)
  ```javascript
  await db.set('hello', { name: 'Friend' })
  ```

*set() is an alias of put(). They both work the same.*

#### get(key)
  ```javascript
  const value = db.get('hello')
  // { name: 'Friend' }
  ```

### log(name|address)

Module: [orbit-db-eventstore](https://github.com/orbitdb/orbit-db-eventstore)

```javascript
const db = await orbitdb.eventlog('site.visitors')
// Or:
const db = await orbitdb.eventlog(anotherlogdb.address)
```

**See the [Store](#store) section for details of common methods and properties.**

#### add(event)
  ```javascript
  const hash = await db.add({ name: 'User1' })
  ```
  
#### get(hash)
  ```javascript
  const event = db.get(hash)
    .map((e) => e.payload.value)
  // { name: 'User1' }
  ```
  
#### iterator([options])

**options** : It is an object which supports the following properties

`gt - (string)`  Greater than, takes an item's `hash`.

`gte - (string)`  Greater than or equal to, takes an item's `hash`.

`lt - (string)`  Less than, takes an item's `hash`.

`lte - (string)`  Less than or equal to, takes an item's `hash` value.

`limit - (integer)`  Limiting the entries of result, defaults to `1`, and `-1` means all items (no limit).

`reverse - (boolean)`  If set to true will result in reversing the result.

If `hash` not found when passing `gt`, `gte`, `lt`, or `lte`, the iterator will return all items (respecting `limit` and `reverse`).

```javascript
const all = db.iterator({ limit: -1 })
  .collect()
  .map((e) => e.payload.value)
// [{ name: 'User1' }]
```

### feed(name|address)

Module: [orbit-db-feedstore](https://github.com/orbitdb/orbit-db-feedstore)

```javascript
const db = await orbitdb.feed('orbit-db.issues')
// Or:
const db = await orbitdb.feed(anotherfeeddb.address)
```

See the [Store](#store) section for details of common methods and properties.

#### add(data)
  ```javascript
  const hash = await db.add({ name: 'User1' })
  ```
  
#### get(hash)
  ```javascript
  const event = db.get(hash)
    .map((e) => e.payload.value)
  // { name: 'User1' }
  ```
  
#### remove(hash)
  ```javascript
  const hash = await db.remove(hash)
  ```
  
#### iterator([options])

**options** : It is an object which supports the following properties

`gt - (string)`  Greater than, takes an item's `hash`.

`gte - (string)`  Greater than or equal to, takes an item's `hash`.

`lt - (string)`  Less than, takes an item's `hash`.

`lte - (string)`  Less than or equal to, takes an item's `hash`.

`limit - (integer)`  Limiting the entries of result, defaults to `1`, and `-1` means all items (no limit).

`reverse - (boolean)`  If set to true will result in reversing the result.

If `hash` not found when passing `gt`, `gte`, `lt`, or `lte`, the iterator will return all items (respecting `limit` and `reverse`).

```javascript
const all = db.iterator({ limit: -1 })
  .collect()
  .map((e) => e.payload.value)
// [{ name: 'User1' }]
```

### docs(name|address, options)

Module: [orbit-db-docstore](https://github.com/orbitdb/orbit-db-docstore)

```javascript
const db = await orbitdb.docs('orbit.users.shamb0t.profile')
// Or:
const db = await orbitdb.docs(anotherdocdb.address)
```

By default, documents are indexed by field `_id`. You can also specify the field to index by:

```javascript
const db = await orbitdb.docs('orbit.users.shamb0t.profile', { indexBy: 'name' })
```

**See the [Store](#store) section for details of common methods and properties.**

#### put(doc)
  ```javascript
  const hash = await db.put({ _id: 'QmAwesomeIpfsHash', name: 'shamb0t', followers: 500 })
  ```
  
#### get(key)
  ```javascript
  const profile = db.get('shamb0t')
    .map((e) => e.payload.value)
  // [{ _id: 'shamb0t', name: 'shamb0t', followers: 500 }]
  ```
  
#### query(mapper)
  ```javascript
  const all = db.query((doc) => doc.followers >= 500)
  // [{ _id: 'shamb0t', name: 'shamb0t', followers: 500 }]
  ```

#### del(key)
  ```javascript
  const hash = await db.del('shamb0t')
  ```
    
### counter(name|address)

Module: [orbit-db-counterstore](https://github.com/orbitdb/orbit-db-counterstore)

```javascript
const counter = await orbitdb.counter('song_123.play_count')
// Or:
const counter = await orbitdb.counter(anothercounterdb.address)
```

**See the [Store](#store) section for details of common methods and properties.**

#### value
  ```javascript
  counter.value // 0
  ```

#### inc([value])
  ```javascript
  await counter.inc()
  counter.value // 1
  await counter.inc(7)
  counter.value // 8
  await counter.inc(-2)
  counter.value // 8
  ```
    
### stop()

  Stop OrbitDB, close databases and disconnect the databases from the network.

  ```javascript
  orbitdb.stop()
  ```

## Store

Every database (store) has the following methods available in addition to their specific methods.

#### load()

Load the locally persisted database state to memory.

With events:
```javascript
db.events.on('ready', () => {
  /* database is now ready to be queried */
})
db.load()
```

Async:
```javascript
await db.load()
/* database is now ready to be queried */
```

#### close()

Close the database.

Async:
```javascript
await db.close()
```

#### drop()

Remove the database locally. This does not delete any data from peers.

```javascript
await db.drop()
```

#### key

The [keypair](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md#keys) used to access the database.

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

The key can also be accessed from the [OrbitDB](#orbitdb) instance: `orbitdb.key.getPublic('hex')`.

#### type

The type of the database as a string.

#### events

Each database in `orbit-db` contains an `events` ([EventEmitter](https://nodejs.org/api/events.html)) object that emits events that describe what's happening in the database. Events can be listened to with:
```javascript
db.events.on(name, callback)
```

- **`replicated`** - (address)

  Emitted when a the database was synced with another peer. This is usually a good place to re-query the database for updated results, eg. if a value of a key was changed or if there are new events in an event log.

  ```javascript
  db.events.on('replicated', (address) => ... )
  ```

- **`replicate`** - (address)

  Emitted before replicating a part of the database with a peer.

  ```javascript
  db.events.on('replicate', (address) => ... )
  ```

- **`replicate.progress`** - (address, hash, entry, progress, have)

  Emitted while replicating a database. *address* is id of the database that emitted the event. *hash* is the multihash of the entry that was just loaded. *entry* is the database operation entry. *progress* is the current progress. *have* is a map of database pieces we have.

  ```javascript
  db.events.on('replicate.progress', (address, hash, entry, progress, have) => ... )
  ```

- **`load`** - (dbname)

  Emitted before loading the database.

  ```javascript
  db.events.on('load', (dbname) => ... )
  ```

- **`load.progress`** - (address, hash, entry, progress, total)

  Emitted while loading the local database, once for each entry. *dbname* is the name of the database that emitted the event. *hash* is the multihash of the entry that was just loaded. *entry* is the database operation entry. *progress* is a sequential number starting from 0 upon calling `load()`.

  ```javascript
  db.events.on('load.progress', (address, hash, entry, progress, total) => ... )
  ```

- **`ready`** - (dbname)

  Emitted after fully loading the local database.

  ```javascript
  db.events.on('ready', (dbname) => ... )
  ```

- **`write`** - (dbname, hash, entry)

  Emitted after an entry was added locally to the database. *hash* is the IPFS hash of the latest state of the database. *entry* is the added database op.

  ```javascript
  db.events.on('write', (dbname, hash, entry) => ... )
  ```
