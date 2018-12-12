# OrbitDB API Documentation

Read the **[GETTING STARTED](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md)** guide for a more in-depth tutorial and to understand how OrbitDB works.

## Table of Contents

<!-- toc -->

- [Constructor](#constructor)
  * [constructor(ipfs, [directory], [options])](#constructoripfs-directory-options)
- [Public Instance Methods](#public-instance-methods)
  * [orbitdb.create(name, type, [options])](#orbitdbcreatename-type-options)
  * [orbitdb.determineAddress(name, type, [options])](#orbitdbdetermineaddressname-type-options)
  * [orbitdb.open(address, [options])](#orbitdbopenaddress-options)
  * [orbitdb.disconnect()](#orbitdbdisconnect)
  * [orbitdb.stop()](#orbitdbstop)
  * [orbitdb.keyvalue(name|address)](#orbitdbkeyvaluenameaddress)
    + [put(key, value)](#putkey-value)
    + [set(key, value)](#setkey-value)
    + [get(key)](#getkey)
  * [orbitdb.kvstore(name|address)](#orbitdbkvstorenameaddress)
  * [orbitdb.log(name|address)](#orbitdblognameaddress)
    + [add(event)](#addevent)
    + [get(hash)](#gethash)
    + [iterator([options])](#iteratoroptions)
  * [orbitdb.eventlog(name|address)](#orbitdbeventlognameaddress)
  * [orbitdb.feed(name|address)](#orbitdbfeednameaddress)
    + [add(data)](#adddata)
    + [get(hash)](#gethash-1)
    + [remove(hash)](#removehash)
    + [iterator([options])](#iteratoroptions-1)
  * [orbitdb.docs(name|address, options)](#orbitdbdocsnameaddress-options)
    + [put(doc)](#putdoc)
    + [get(key)](#getkey-1)
    + [query(mapper)](#querymapper)
    + [del(key)](#delkey)
  * [orbitdb.docstore(name|address, options)](#orbitdbdocstorenameaddress-options)
  * [orbitdb.counter(name|address)](#orbitdbcounternameaddress)
    + [value](#value)
    + [inc([value])](#incvalue)
- [Static Properties](#static-properties)
  * [OrbitDB.databaseTypes](#orbitdbdatabasetypes)
- [Static Methods](#static-methods)
  * [OrbitDB.isValidType(type)](#orbitdbisvalidtypetype)
  * [OrbitDB.addDatabaseType(type, store)](#orbitdbadddatabasetypetype-store)
  * [OrbitDB.getDatabaseTypes()](#orbitdbgetdatabasetypes)
  * [OrbitDB.isValidAddress(address)](#orbitdbisvalidaddressaddress)
  * [OrbitDB.parseAddress(address)](#orbitdbparseaddressaddress)
- [Store API](#store-api)
  * [store.load([amount])](#storeloadamount)
  * [store.close()](#storeclose)
  * [store.drop()](#storedrop)
  * [store.key](#storekey)
  * [store.type](#storetype)
- [Store Events](#store-events)
  * [`replicated`](#replicated)
  * [`replicate`](#replicate)
    + [`replicate.progress`](#replicateprogress)
  * [`load`](#load)
    + [`load.progress`](#loadprogress)
  * [`ready`](#ready)
  * [`write`](#write)
  * [`closed`](#closed)

<!-- tocstop -->

## Constructor

### constructor(ipfs, [directory], [options])
```javascript
const orbitdb = new OrbitDB(ipfs)
```
Creates and returns an instance of OrbitDB. Use the optional `directory` argument to specify a path to be used for the database files (Default: `'./orbitdb'`). In addition, you can use the optional `options` argument for further configuration. It is an object with any of these properties:

- `peerId` (string): By default it uses the base58 string of the ipfs peer id.

- `keystore` (Keystore Instance) : By default creates an instance of [Keystore](https://github.com/orbitdb/orbit-db-keystore). A custom keystore instance can be used, see [this](https://github.com/orbitdb/orbit-db/blob/master/test/utils/custom-test-keystore.js) for an example.

- 'cache' (Cache Instance) : By default creates an instance of [Cache](https://github.com/orbitdb/orbit-db-cache). A custom cache instance can also be used.

After creating an `OrbitDB` instance , you can access the different data stores. Creating a database instance, eg. with `orbitdb.keyvalue(...)`, returns a *Promise* that resolves to a [database instance](#store-api). See the [Store](#store-api) section for details of common methods and properties.

*For further details, see usage for [kvstore](https://github.com/orbitdb/orbit-db-kvstore#usage), [eventlog](https://github.com/orbitdb/orbit-db-eventstore#usage), [feed](https://github.com/orbitdb/orbit-db-feedstore#usage), [docstore](https://github.com/orbitdb/orbit-db-docstore#usage) and [counter](https://github.com/orbitdb/orbit-db-counterstore#usage).*

```javascript
const db = await orbitdb.keyvalue('profile')
```

## Public Instance Methods

### orbitdb.create(name, type, [options])
> Creates and opens an OrbitDB database.

Returns a `Promise` that resolves to [a database instance](#store-api). `name` (string) should be the database name, not an OrbitDB address (i.e. `user.posts`). `type` is a supported database type (i.e. `eventlog` or [an added custom type](https://github.com/orbitdb/orbit-db#custom-store-types)). `options` is an object with any of the following properties:
- `directory` (string): The directory where data will be stored (Default: uses directory option passed to OrbitDB constructor or `./orbitdb` if none was provided).
- `write` (array): An array of hex encoded public keys which are used to set write access to the database. `["*"]` can be passed in to give write access to everyone. See the [GETTING STARTED](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md) guide for more info. (Default: uses the OrbitDB instance key `orbitdb.key`, which would give write access only to yourself)
- `overwrite` (boolean): Overwrite an existing database (Default: `false`)
- `replicate` (boolean): Replicate the database with peers, requires IPFS PubSub. (Default: `true`)
```javascript
const db = await orbitdb.create('user.posts', 'eventlog', {
  write: [
    // Give access to ourselves
    orbitdb.key.getPublic('hex'),
    // Give access to the second peer
    '042c07044e7ea51a489c02854db5e09f0191690dc59db0afd95328c9db614a2976e088cab7c86d7e48183191258fc59dc699653508ce25bf0369d67f33d5d77839'
  ]
})
// db created & opened
```

### orbitdb.determineAddress(name, type, [options])
> Returns the orbit-db address for given parameters

Returns a `Promise` that resolves to an orbit-db address. The parameters correspond exactly with the parameters of [orbit-db.create](#orbitdbcreatename-type-options). This is useful for determining a database address ahead of time, or deriving another peer's address from their public key and the database name and type. *No database is actually created.*

```javascript
const dbAddress = await orbitdb.determineAddress('user.posts', 'eventlog', {
  write: [
    // This could be someone else's public key
    '042c07044e7ea51a489c02854db5e09f0191690dc59db0afd95328c9db614a2976e088cab7c86d7e48183191258fc59dc699653508ce25bf0369d67f33d5d77839'
  ]
})
```

### orbitdb.open(address, [options])
> Opens an OrbitDB database.

Returns a `Promise` that resolves to [a database instance](#store-api). `address` (string) should be a valid OrbitDB address. If a database name is provided instead, it will check `options.create` to determine if it should create the database. `options` is an object with any of the following properties:

- `localOnly` (boolean): If set to `true`, will throw an error if the database can't be found locally. (Default: `false`)
- `directory` (string): The directory where data will be stored (Default: uses directory option passed to OrbitDB constructor or `./orbitdb` if none was provided).
- `create` (boolean): Whether or not to create the database if a valid OrbitDB address is not provided. (Default: `false`)
- `type` (string): A supported database type (i.e. `eventlog` or [an added custom type](https://github.com/orbitdb/orbit-db#custom-store-types)). Required if create is set to `true`. Otherwise it's used to validate the manifest.
- `overwrite` (boolean): Overwrite an existing database (Default: `false`)
- `replicate` (boolean): Replicate the database with peers, requires IPFS PubSub. (Default: `true`)
```javascript
const db = await orbitdb.open('/orbitdb/Qmd8TmZrWASypEp4Er9tgWP4kCNQnW4ncSnvjvyHQ3EVSU/first-database')
```

Convienance methods are available when opening/creating any of the default OrbitDB database types: [feed](#orbitdbfeednameaddress), [docs](#orbitdbdocsnameaddress-options), [log](#orbitdblognameaddress), [keyvalue](#orbitdbkeyvaluenameaddress), [counter](#orbitdbcounternameaddress)

You can use: `orbitdb.feed(address, options)`

Instead of: `orbitdb.open(address, { type: 'feed', ...options })`

### orbitdb.disconnect()
>Close databases, connections, pubsub and reset orbitdb state.

Returns a `Promise` that resolves once complete.

```javascript
await orbitdb.disconnect()
```

### orbitdb.stop()

Alias for `orbitdb.disconnect()`
```javascript
await orbitdb.stop()
```

### orbitdb.keyvalue(name|address)
> Creates and opens a keyvalue database

Returns a `Promise` that resolves to a [`KeyValueStore` instance](https://github.com/orbitdb/orbit-db-kvstore).

```javascript
const db = await orbitdb.keyvalue('application.settings')
// Or:
const db = await orbitdb.keyvalue(anotherkvdb.address)
```

Module: [orbit-db-kvstore](https://github.com/orbitdb/orbit-db-kvstore)

**See the [Store](#store-api) section for details of common methods and properties.**

#### put(key, value)
Returns a `Promise` that resolves to a `String` that is the multihash of the entry.
  ```javascript
  await db.put('hello', { name: 'World' })
  ```

#### set(key, value)
Alias for `.put()`
  ```javascript
  await db.set('hello', { name: 'Friend' })
  ```

#### get(key)
Returns an `Object` with the contents of the entry.
  ```javascript
  const value = db.get('hello')
  // { name: 'Friend' }
  ```

### orbitdb.kvstore(name|address)

Alias for [`orbitdb.keyvalue()`](#orbitdbkeyvaluenameaddress)

### orbitdb.log(name|address)
> Creates and opens an eventlog database

Returns a `Promise` that resolves to a [`EventStore` instance](https://github.com/orbitdb/orbit-db-eventstore).

```javascript
const db = await orbitdb.eventlog('site.visitors')
// Or:
const db = await orbitdb.eventlog(anotherlogdb.address)
```

Module: [orbit-db-eventstore](https://github.com/orbitdb/orbit-db-eventstore)

**See the [Store](#store-api) section for details of common methods and properties.**

#### add(event)
Returns a `Promise` that resolves to the multihash of the entry as a `String`.
  ```javascript
  const hash = await db.add({ name: 'User1' })
  ```

#### get(hash)
Returns an `Object` with the contents of the entry.
  ```javascript
  const event = db.get(hash)
    .map((e) => e.payload.value)
  // { name: 'User1' }
  ```

#### iterator([options])

Returns an `Array` of `Objects` based on the `options`.

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

### orbitdb.eventlog(name|address)

Alias for [`orbitdb.log()`](#orbitdblognameaddress)

### orbitdb.feed(name|address)
> Creates and opens a feed database

Returns a `Promise` that resolves to a [`FeedStore` instance](https://github.com/orbitdb/orbit-db-feedstore).

```javascript
const db = await orbitdb.feed('orbit-db.issues')
// Or:
const db = await orbitdb.feed(anotherfeeddb.address)
```

Module: [orbit-db-feedstore](https://github.com/orbitdb/orbit-db-feedstore)

See the [Store](#store-api) section for details of common methods and properties.

#### add(data)
Returns a `Promise` that resolves to the multihash of the entry as a `String`.
  ```javascript
  const hash = await db.add({ name: 'User1' })
  ```

#### get(hash)
Returns an `Object` with the contents of the entry.
  ```javascript
  const event = db.get(hash)
    .map((e) => e.payload.value)
  // { name: 'User1' }
  ```

#### remove(hash)
Returns a `Promise` that resolves to the multihash of the entry as a `String`.
  ```javascript
  const hash = await db.remove(hash)
  ```

#### iterator([options])

Returns an `Array` of `Objects` based on the `options`.

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

### orbitdb.docs(name|address, options)
> Creates and opens a docstore database

Returns a `Promise` that resolves to a [`DocumentStore` instance](https://github.com/orbitdb/orbit-db-docstore).

```javascript
const db = await orbitdb.docs('orbit.users.shamb0t.profile')
// Or:
const db = await orbitdb.docs(anotherdocdb.address)
```

By default, documents are indexed by field `_id`. You can also specify the field to index by:

```javascript
const db = await orbitdb.docs('orbit.users.shamb0t.profile', { indexBy: 'name' })
```

Module: [orbit-db-docstore](https://github.com/orbitdb/orbit-db-docstore)

**See the [Store](#store-api) section for details of common methods and properties.**

#### put(doc)
Returns a `Promise` that resolves to the multihash of the entry as a `String`.
  ```javascript
  const hash = await db.put({ _id: 'QmAwesomeIpfsHash', name: 'shamb0t', followers: 500 })
  ```

#### get(key)
Returns an `Array` with a single `Object` if key exists.
  ```javascript
  const profile = db.get('shamb0t')
  // [{ _id: 'shamb0t', name: 'shamb0t', followers: 500 }]
  ```

#### query(mapper)
Returns an `Array` of `Objects` based on the `mapper`.
  ```javascript
  const all = db.query((doc) => doc.followers >= 500)
  // [{ _id: 'shamb0t', name: 'shamb0t', followers: 500 }]
  ```

#### del(key)
Returns a `Promise` that resolves to the multihash of the entry as a `String`.
  ```javascript
  const hash = await db.del('shamb0t')
  ```

### orbitdb.docstore(name|address, options)

Alias for [`orbitdb.docs()`](#orbitdbdocsnameaddress-options)

### orbitdb.counter(name|address)
> Creates and opens a counter database

Returns a `Promise` that resolves to a [`CounterStore` instance](https://github.com/orbitdb/orbit-db-counterstore).

```javascript
const counter = await orbitdb.counter('song_123.play_count')
// Or:
const counter = await orbitdb.counter(anothercounterdb.address)
```

Module: [orbit-db-counterstore](https://github.com/orbitdb/orbit-db-counterstore).

**See the [Store](#store-api) section for details of common methods and properties.**

#### value
Returns a `Number`.
  ```javascript
  counter.value // 0
  ```

#### inc([value])
Returns a `Promise` that resolves to the multihash of the entry as a `String`.
  ```javascript
  await counter.inc()
  counter.value // 1
  await counter.inc(7)
  counter.value // 8
  await counter.inc(-2)
  counter.value // 8
  ```

## Static Properties
### OrbitDB.databaseTypes
Returns supported database types (i.e. store types) as an `Array` of `Strings`
```js
OrbitDB.databaseTypes
// [ 'counter', 'eventlog', 'feed', 'docstore', 'keyvalue']
```

## Static Methods

### OrbitDB.isValidType(type)
Returns `true` if the provided `String` is a supported database type
```js
OrbitDB.isValidType('docstore')
// true
```

### OrbitDB.addDatabaseType(type, store)
Adds a custom database type & store to OrbitDB
```js
const CustomStore = require('./CustomStore')
OrbitDB.addDatabaseType(CustomStore.type, CustomStore)
```

### OrbitDB.getDatabaseTypes()
Returns an `Object` mapping database types to Store Classes
```js
OrbitDB.getDatabaseTypes()
// { counter: [Function: CounterStore],
//  eventlog: [Function: EventStore],
//  feed: [Function: FeedStore],
//  docstore: [Function: DocumentStore],
//  keyvalue: [Function: KeyValueStore] }
```
### OrbitDB.isValidAddress(address)
Returns `true` if the provided `String` is a valid OrbitDB address
```js
OrbitDB.isValidAddress('/orbitdb/Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC/first-database')
// true
```
### OrbitDB.parseAddress(address)
Returns an instance of OrbitDBAddress if the provided `String` is a valid orbitdb address
```js
OrbitDB.parseAddress('/orbitdb/Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC/first-database')
// OrbitDBAddress {
//  root: 'Qmdgwt7w4uBsw8LXduzCd18zfGXeTmBsiR8edQ1hSfzcJC',
//  path: 'first-database' }
```

## Store API

Every database (store) has the following methods available in addition to their specific methods.

### store.load([amount])

Load the locally persisted database state to memory. Use the optional `amount` argument to limit the number of entries loaded into memory, starting from the head(s) (Default: `-1` will load all entries)

Returns a `Promise` that resolves once complete

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

### store.close()
> Close the database.
Returns a `Promise` that resolves once complete

Async:
```javascript
await db.close()
```

### store.drop()
> Remove the database locally. This does not delete any data from peers.

Returns a `Promise` that resolves once complete

```javascript
await db.drop()
```

### store.key

Returns an instance of [`KeyPair`](https://github.com/indutny/elliptic/blob/master/lib/elliptic/ec/key.js#L8). The keypair is used to sign the database entries. See the [GUIDE](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md#keys) for more information on how OrbitDB uses the keypair.

```
const key = db.key
console.log(key)
// <Key priv: db8ef129f3d26ac5d7c17b402027488a8f4b2e7fa855c27d680b714cf9c1f87e
// pub: <EC Point x: f0e33d60f9824ce10b2c8983d3da0311933e82cf5ec9374cd82c0af699cbde5b
// y: ce206bfccf889465c6g6f9a7fdf452f9c3e1204a6f1b4582ec427ec12b116de9> >
```

The public key can be retrieved with:
```
console.log(db.key.getPublic('hex'))
// 04d009bd530f2fa0cda29202e1b15e97247893cb1e88601968abfe787f7ea03828fdb7624a618fd67c4c437ad7f48e670cc5a6ea2340b896e42b0c8a3e4d54aebe
```

The key can also be accessed from the OrbitDB instance: `orbitdb.key.getPublic('hex')`.

### store.type

Returns the type of the database as a `String`.

## Store Events

Each database in `orbit-db` contains an `events` ([EventEmitter](https://nodejs.org/api/events.html)) object that emits events that describe what's happening in the database. Events can be listened to with:
```javascript
db.events.on(name, callback)
```

### `replicated`
```javascript
db.events.on('replicated', (address) => ... )
```

Emitted when the database has synced with another peer. This is usually a good place to re-query the database for updated results, eg. if a value of a key was changed or if there are new events in an event log.

### `replicate`
```javascript
db.events.on('replicate', (address) => ... )
```

Emitted before replicating a part of the database with a peer.

#### `replicate.progress`
```javascript
db.events.on('replicate.progress', (address, hash, entry, progress, have) => ... )
```

Emitted while replicating a database. *address* is id of the database that emitted the event. *hash* is the multihash of the entry that was just loaded. *entry* is the database operation entry. *progress* is the current progress. *have* is a map of database pieces we have.

### `load`
```javascript
db.events.on('load', (dbname) => ... )
```

Emitted before loading the database.

#### `load.progress`
```javascript
db.events.on('load.progress', (address, hash, entry, progress, total) => ... )
```

Emitted while loading the local database, once for each entry. *dbname* is the name of the database that emitted the event. *hash* is the multihash of the entry that was just loaded. *entry* is the database operation entry. *progress* is a sequential number starting from 0 upon calling `load()`.

### `ready`
```javascript
db.events.on('ready', (dbname, heads) => ... )
```

Emitted after fully loading the local database.

### `write`
```javascript
db.events.on('write', (dbname, hash, entry) => ... )
```

Emitted after an entry was added locally to the database. *hash* is the IPFS hash of the latest state of the database. *entry* is the added database op.

### `closed`
Emitted once the database has finished closing.
```javascript
db.events.on('closed', (dbname) => ... )
```
