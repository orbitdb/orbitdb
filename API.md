# OrbitDB API Documentation

Read the **[GETTING STARTED](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md)** guide for a more in-depth tutorial and to understand how OrbitDB works.

## Table of Contents

<!-- toc -->

- [Creating an OrbitDB instance](#creating-an-orbitdb-instance)
  * [createInstance(ipfs, [options])](#createinstanceipfs-options)
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
    + [del(key)](#delkey)
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
    + [del(key)](#delkey-1)
  * [orbitdb.docstore(name|address, options)](#orbitdbdocstorenameaddress-options)
  * [orbitdb.counter(name|address)](#orbitdbcounternameaddress)
    + [value](#value)
    + [inc([value])](#incvalue)
- [Static Properties](#static-properties)
  * [OrbitDB.databaseTypes](#orbitdbdatabasetypes)
- [Static Methods](#static-methods)
  * [OrbitDB.createInstance(ipfs)](#orbitdbcreateinstanceipfs)
  * [OrbitDB.isValidType(type)](#orbitdbisvalidtypetype)
  * [OrbitDB.addDatabaseType(type, store)](#orbitdbadddatabasetypetype-store)
  * [OrbitDB.getDatabaseTypes()](#orbitdbgetdatabasetypes)
  * [OrbitDB.isValidAddress(address)](#orbitdbisvalidaddressaddress)
  * [OrbitDB.parseAddress(address)](#orbitdbparseaddressaddress)
- [Store API](#store-api)
  * [store.load([amount], { fetchEntryTimeout })](#storeloadamount--fetchentrytimeout-)
  * [store.close()](#storeclose)
  * [store.drop()](#storedrop)
  * [store.identity](#storeidentity)
  * [store.type](#storetype)
- [Store Events](#store-events)
  * [`replicated`](#replicated)
  * [`replicate`](#replicate)
    + [`replicate.progress`](#replicateprogress)
  * [`load`](#load)
    + [`load.progress`](#loadprogress)
  * [`ready`](#ready)
  * [`write`](#write)
  * [`peer`](#peer)
  * [`closed`](#closed)

<!-- tocstop -->

## Creating an OrbitDB instance

### createInstance(ipfs, [options])
```javascript
const orbitdb = await OrbitDB.createInstance(ipfs)
```
Creates and returns an instance of OrbitDB. Use the optional `options` argument for further configuration. It is an object with any of these properties:

- `directory` (string): path to be used for the database files. By default it uses `'./orbitdb'`.

- `peerId` (string): By default it uses the base58 string of the ipfs peer id.

- `keystore` (Keystore Instance) : By default creates an instance of [Keystore](https://github.com/orbitdb/orbit-db-keystore). A custom keystore instance can be used, see [this](https://github.com/orbitdb/orbit-db/blob/master/test/utils/custom-test-keystore.js) for an example.

- `cache` (Cache Instance) : By default creates an instance of [Cache](https://github.com/orbitdb/orbit-db-cache). A custom cache instance can also be used.

- `identity` (Identity Instance): By default it creates an instance of [Identity](https://github.com/orbitdb/orbit-db-identity-provider/blob/master/src/identity.js)

- `offline` (boolean): Start the OrbitDB instance in offline mode. Databases are not be replicated when the instance is started in offline mode. If the OrbitDB instance was started offline mode and you want to start replicating databases, the OrbitDB instance needs to be re-created. Default: `false`.

After creating an `OrbitDB` instance, you can access the different data stores. Creating a database instance, eg. with `orbitdb.keyvalue(...)`, returns a *Promise* that resolves to a [database instance](#store-api). See the [Store](#store-api) section for details of common methods and properties.

*For further details, see usage for [kvstore](https://github.com/orbitdb/orbit-db-kvstore#usage), [eventlog](https://github.com/orbitdb/orbit-db-eventstore#usage), [feed](https://github.com/orbitdb/orbit-db-feedstore#usage), [docstore](https://github.com/orbitdb/orbit-db-docstore#usage) and [counter](https://github.com/orbitdb/orbit-db-counterstore#usage).*

```javascript
const db = await orbitdb.keyvalue('profile')
```

## Public Instance Methods

Before starting, you should know that OrbitDB has different types of databases. Each one satisfies a different purpose. The databases that you can create are:

* [log](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdblognameaddress): an immutable (write only) log database. Useful for transactions lists.
* [feed](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbfeednameaddress): a mutable log database. Useful for blog comments.
* [keyvalue](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbkeyvaluenameaddress): Useful for loading data from keywords or an id.
* [docs](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbdocsnameaddress-options): a JSON documents database. Useful for user data or other structured data.
* [counter](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbcounternameaddress): Useful for ordered data (like an ordered list or a playlist.)


### orbitdb.create(name, type, [options])
> Creates and opens an OrbitDB database.

Returns a `Promise` that resolves to [a database instance](#store-api). `name` (string) should be the database name, not an OrbitDB address (i.e. `user.posts`). `type` is a supported database type (i.e. `eventlog` or [an added custom type](https://github.com/orbitdb/orbit-db#custom-store-types)). `options` is an object with any of the following properties:
- `accessController` (object): An object, as shown in the example below, containing the key `write` whose value is an array of hex encoded public keys which are used to set write access to the database. `["*"]` can be passed in to give write access to everyone. See the [GETTING STARTED](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md) guide for more info.
(Default: uses the OrbitDB identity id `orbitdb.identity.id`, which would give write access only to yourself)

- `overwrite` (boolean): Overwrite an existing database (Default: `false`)
- `replicate` (boolean): Replicate the database with peers, requires IPFS PubSub. (Default: `true`)
- `meta` (object): An optional object in [database manifest](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md#address). Immutably stores any JSON-serializable value. Readable via `db.options.meta`. Default: `undefined`.

```javascript
const db = await orbitdb.create('user.posts', 'eventlog', {
    accessController: {
      write: [
        // Give access to ourselves
        orbitdb.identity.id,
        // Give access to the second peer
        '042c07044e7ea51a489c02854db5e09f0191690dc59db0afd95328c9db614a2976e088cab7c86d7e48183191258fc59dc699653508ce25bf0369d67f33d5d77839'
      ]
    },
    overwrite: true,
    replicate: false,
    meta: { hello: 'meta hello' }
})
// db created & opened
```

### orbitdb.determineAddress(name, type, [options])
> Returns the orbit-db address for given parameters

Returns a `Promise` that resolves to an orbit-db address. The parameters correspond exactly with the parameters of [orbit-db.create](#orbitdbcreatename-type-options). This is useful for determining a database address ahead of time, or deriving another peer's address from their public key and the database name and type. *No database is actually created.*

```javascript
const dbAddress = await orbitdb.determineAddress('user.posts', 'eventlog', {
  accessController: {
    write: [
    // This could be someone else's public key
    '042c07044e7ea51a489c02854db5e09f0191690dc59db0afd95328c9db614a2976e088cab7c86d7e48183191258fc59dc699653508ce25bf0369d67f33d5d77839'
  ]}
})
```

### orbitdb.open(address, [options])
> Opens an OrbitDB database.

Returns a `Promise` that resolves to [a database instance](#store-api). `address` (string) should be a valid OrbitDB address. If a database name is provided instead, it will check `options.create` to determine if it should create the database. `options` is an object with any of the following properties:

- `localOnly` (boolean): If set to `true`, will throw an error if the database can't be found locally. (Default: `false`)
- `create` (boolean): Whether or not to create the database if a valid OrbitDB address is not provided. (Default: `false`)
- `type` (string): A supported database type (i.e. `eventlog` or [an added custom type](https://github.com/orbitdb/orbit-db#custom-store-types)). Required if create is set to `true`. Otherwise it's used to validate the manifest.
- `overwrite` (boolean): Overwrite an existing database (Default: `false`)
- `replicate` (boolean): Replicate the database with peers, requires IPFS PubSub. (Default: `true`)
```javascript
const db = await orbitdb.open('/orbitdb/Qmd8TmZrWASypEp4Er9tgWP4kCNQnW4ncSnvjvyHQ3EVSU/first-database')
```

Convenience methods are available when opening/creating any of the default OrbitDB database types: [feed](#orbitdbfeednameaddress), [docs](#orbitdbdocsnameaddress-options), [log](#orbitdblognameaddress), [keyvalue](#orbitdbkeyvaluenameaddress), [counter](#orbitdbcounternameaddress)

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

#### del(key)
Deletes the `Object` associated with `key`. Returns a `Promise` that resolves to a `String` that is the multihash of the deleted entry.
  ```javascript
  const hash = await db.del('hello')
  // QmbYHhnXEdmdfUDzZKeEg7HyG2f8veaF2wBrYFcSHJ3mvd
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
  // to get all the records
  const profile = db.get('');
  // returns all the records
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

### OrbitDB.createInstance(ipfs)
Returns a `Promise` that resolved to an instance of `OrbitDB`.

```js
const orbitdb = await OrbitDB.createInstance(ipfs)
```

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

### store.load([amount], { fetchEntryTimeout })

Load the locally persisted database state to memory. Use the optional `amount` argument to limit the number of entries loaded into memory, starting from the head(s) (Default: `-1` will load all entries). `fetchEntryTimeout` defines the timeout for fetching an entry.

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

### store.identity

Returns an instance of [Identity](https://github.com/orbitdb/orbit-db-identity-provider/blob/master/src/identity.js). The identity is used to sign the database entries. See the [GUIDE](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md#identity) for more information on how OrbitDB uses identity.

```javascript
const identity = db.identity
console.log(identity.toJSON())
{ id: 'QmZyYjpG6SMJJx2rbye8HXNMufGRtpn9yFkdd27uuq6xrR',
  publicKey: '0446829cbd926ad8e858acdf1988b8d586214a1ca9fa8c7932af1d59f7334d41aa2ec2342ea402e4f3c0195308a4815bea326750de0a63470e711c534932b3131c',
  signatures:
   { id: '3045022058bbb2aa415623085124b32b254b8668d95370261ade8718765a8086644fc8ae022100c736b45c6b2ef60c921848027f51020a70ee50afa20bc9853877e994e6121c15',
     publicKey: '3046022100d138ccc0fbd48bd41e74e40ddf05c1fa6ff903a83b2577ef7d6387a33992ea4b022100ca39e8d8aef43ac0c6ec05c1b95b41fce07630b5dc61587a32d90dc8e4cf9766'
   },
  type: 'orbitdb'
}
```

The public key can be retrieved with:
```javascript
console.log(db.identity.publicKey)
// 0446829cbd926ad8e858acdf1988b8d586214a1ca9fa8c7932af1d59f7334d41aa2ec2342ea402e4f3c0195308a4815bea326750de0a63470e711c534932b3131c
```

The key can also be accessed from the OrbitDB instance: `orbitdb.identity.publicKey`.

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
db.events.on('write', (address, entry, heads) => ... )
```

Emitted after an entry was added locally to the database. *hash* is the IPFS hash of the latest state of the database. *entry* is the added database op.

### `peer`
```javascript
db.events.on('peer', (peer) => ... )
```

Emitted when a new peer connects via ipfs pubsub. *peer* is a string containing the id of the new peer

### `closed`
Emitted once the database has finished closing.
```javascript
db.events.on('closed', (dbname) => ... )
```
