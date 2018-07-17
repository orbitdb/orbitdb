# OrbitDB

[![](https://img.shields.io/badge/freenode-%23orbitdb-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23orbitdb)
[![CircleCI Status](https://circleci.com/gh/orbitdb/orbit-db.svg?style=shield)](https://circleci.com/gh/orbitdb/orbit-db)
[![npm version](https://badge.fury.io/js/orbit-db.svg)](https://www.npmjs.com/package/orbit-db)
[![node](https://img.shields.io/node/v/orbit-db.svg)](https://www.npmjs.com/package/orbit-db)
[![Project Status](https://badge.waffle.io/orbitdb/orbit-db.svg?columns=In%20Progress&title=In%20Progress)](https://waffle.io/orbitdb/orbit-db)

> A peer-to-peer database for the decentralized web

OrbitDB is a serverless, distributed, peer-to-peer database. OrbitDB uses [IPFS](https://ipfs.io) as its data storage and [IPFS Pubsub](https://github.com/ipfs/go-ipfs/blob/master/core/commands/pubsub.go#L23) to automatically sync databases with peers. It's an eventually consistent database that uses [CRDTs](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type) for conflict-free database merges making OrbitDB an excellent choice for decentralized apps (dApps), blockchain applications and offline-first web applications.

**Test it live at [Live demo 1](https://ipfs.io/ipfs/QmeESXh9wPib8Xz7hdRzHuYLDuEUgkYTSuujZ2phQfvznQ/), [Live demo 2](https://ipfs.io/ipfs/QmasHFRj6unJ3nSmtPn97tWDaQWEZw3W9Eh3gUgZktuZDZ/), or [P2P TodoMVC app](https://ipfs.io/ipfs/QmTJGHccriUtq3qf3bvAQUcDUHnBbHNJG2x2FYwYUecN43/)**!


OrbitDB provides various types of databases for different data models and use cases:

- **[log](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdblognameaddress)**: an immutable (append-only) log with traversable history. Useful for *"latest N"* use cases or as a message queue.
- **[feed](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbfeednameaddress)**: a mutable log with traversable history. Entries can be added and removed. Useful for *"shopping cart" type of use cases, or for example as a feed of blog posts or "tweets".
- **[keyvalue](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbkeyvaluenameaddress)**: a key-value database just like your favourite key-value database.
- **[docs](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbdocsnameaddress-options)**: a document database to which JSON documents can be stored and indexed by a specified key. Useful for building search indices or version controlling documents and data.
- **[counter](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbcounternameaddress)**: Useful for counting events separate from log/feed data.

All databases are [implemented](https://github.com/orbitdb/orbit-db-store) on top of [ipfs-log](https://github.com/orbitdb/ipfs-log), an immutable, operation-based conflict-free replicated data structure (CRDT) for distributed systems.

#### Project status & support
This is the Javascript implementation and it works both in **Browsers** and **Node.js** with support for Linux and OS X (Windows is not supported yet). The minimum required version of Node.js is now 8.0.0. To use with older versions of Node.js, we provide an ES5-compatible build through the npm package, located in `dist/es5/` when installed through npm.

## Table of Contents

- [Usage](#usage)
  - [CLI](#cli)
  - [Module with IPFS Instance](#module-with-ipfs-instance)
  - [Module with IPFS Daemon](#module-with-ipfs-daemon)
- [API](#api)
- [Examples](#examples)
- [Packages](#packages)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Usage

Read the **[GETTING STARTED](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md)** guide for a more in-depth tutorial and to understand how OrbitDB works.

### CLI

For the CLI tool to manage orbit-db database, see **[OrbitDB CLI](https://github.com/orbitdb/orbit-db-cli)**.

It can be installed from Npm with:

```
npm install orbit-db-cli -g
```

### Module with IPFS Instance

If you're using `orbitd-db` to develop **browser** applications, use it as a module with the javascript instance of IPFS

Install dependencies:

```
npm install orbit-db ipfs
```

```javascript
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

// OrbitDB uses Pubsub which is an experimental feature
// and need to be turned on manually.
// Note that these options need to be passed to IPFS in
// all examples even if not specfied so.
const ipfsOptions = {
  EXPERIMENTAL: {
    pubsub: true
  }
}

// Create IPFS instance
const ipfs = new IPFS(ipfsOptions)

ipfs.on('error', (e) => console.error(e))
ipfs.on('ready', async () => {
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
  console.log(JSON.stringify(result, null, 2))
})
```

### Module with IPFS Daemon
Alternatively, you can use [ipfs-api](https://npmjs.org/package/ipfs-api) to use `orbit-db` with a locally running IPFS daemon. Use this method if you're using `orbitd-db` to develop **backend** or **desktop** applications, eg. with [Electron](https://electron.atom.io).

Install dependencies:

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

## API

See [API documentation](https://github.com/orbitdb/orbit-db/blob/master/API.md) for the full documentation.

### constructor(ipfs, [directory], [options])
```javascript
const orbitdb = new OrbitDB(ipfs)
```
Creates and returns an instance of OrbitDB. Use the optional `directory` argument to specify a path to be used for the database files (Default: `'./orbitdb'`). In addition, you can use the optional `options` argument for further configuration. It is an object with any of these properties:

- `peerId` (string): By default it uses the base58 string of the ipfs peer id.

- `keystore` (Keystore Instance) : By default creates an instance of [Keystore](https://github.com/orbitdb/orbit-db-keystore). A custom keystore instance can be used, see [this](https://github.com/orbitdb/orbit-db/blob/master/test/utils/custom-test-keystore.js) for an example.

After creating an `OrbitDB` instance , you can access the different data stores. Creating a database instance, eg. with `orbitdb.keyvalue(...)`, returns a *Promise* that resolves to a database instance.

*For further details, see usage for [kvstore](https://github.com/orbitdb/orbit-db-kvstore#usage), [eventlog](https://github.com/orbitdb/orbit-db-eventstore#usage), [feed](https://github.com/orbitdb/orbit-db-feedstore#usage), [docstore](https://github.com/orbitdb/orbit-db-docstore#usage) and [counter](https://github.com/orbitdb/orbit-db-counterstore#usage).*

**Public OrbitDB Instance Methods**
- [orbitdb.create(name|address, type, [options])](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbcreatename-type-options)
- [orbitdb.open(name|address, [options])](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbopenaddress-options)
- [orbitdb.disconnect()](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbdisconnect)
- [orbitdb.stop()](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbstop)
- [orbitdb.keyvalue(name|address)](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbkeyvaluenameaddress)
  - [kv.put(key, value)](https://github.com/orbitdb/orbit-db/blob/master/API.md#putkey-value)
  - [kv.set(key, value)](https://github.com/orbitdb/orbit-db/blob/master/API.md#setkey-value)
  - [kv.get(key)](https://github.com/orbitdb/orbit-db/blob/master/API.md#getKey)
- [orbitdb.log(name|address)](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdblognameaddress)
  - [log.add(event)](https://github.com/orbitdb/orbit-db/blob/master/API.md#addevent)
  - [log.get(hash)](https://github.com/orbitdb/orbit-db/blob/master/API.md#gethash)
  - [log.iterator([options])](https://github.com/orbitdb/orbit-db/blob/master/API.md#iteratoroptions)
- [orbitdb.feed(name|address)](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbfeednameaddress)
  - [feed.add(data)](https://github.com/orbitdb/orbit-db/blob/master/API.md#adddata)
  - [feed.get(hash)](https://github.com/orbitdb/orbit-db/blob/master/API.md#gethash-1)
  - [feed.remove(hash)](https://github.com/orbitdb/orbit-db/blob/master/API.md#removehash)
  - [feed.iterator([options])](https://github.com/orbitdb/orbit-db/blob/master/API.md#iteratoroptions-1)
- [orbitdb.docs(name|address, options)](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbdocsnameaddress-options)
  - [docs.put(doc)](https://github.com/orbitdb/orbit-db/blob/master/API.md#putdoc)
  - [docs.get(hash)](https://github.com/orbitdb/orbit-db/blob/master/API.md#getkey-1)
  - [docs.query(mapper)](https://github.com/orbitdb/orbit-db/blob/master/API.md#querymapper)
  - [del(key)](https://github.com/orbitdb/orbit-db/blob/master/API.md#delkey)
- [orbitdb.counter(name|address)](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbcounternameaddress)
  - [counter.value](https://github.com/orbitdb/orbit-db/blob/master/API.md#value)
  - [counter.inc([value])](https://github.com/orbitdb/orbit-db/blob/master/API.md#incvalue)

**Static Properties**
- [OrbitDB.databaseTypes](https://github.com/orbitdb/orbit-db/blob/master/API.md#databasetypes)

**Static Methods**
- [OrbitDB.isValidType(type)](https://github.com/orbitdb/orbit-db/blob/master/API.md#isvalidtypetype)
- [OrbitDB.addDatabaseType(type, store)](https://github.com/orbitdb/orbit-db/blob/master/API.md#adddatabasetypetype-store)
- [OrbitDB.getDatabaseTypes()](https://github.com/orbitdb/orbit-db/blob/master/API.md#getdatabasetypes)
- [OrbitDB.isValidAddress(address)](https://github.com/orbitdb/orbit-db/blob/master/API.md#isvalidaddressaddress)
- [OrbitDB.parseAddress(address)](https://github.com/orbitdb/orbit-db/blob/master/API.md#parseaddressaddress)

**[Store API](https://github.com/orbitdb/orbit-db/blob/master/API.md#store)**
- [load()](https://github.com/orbitdb/orbit-db/blob/master/API.md#storeload)
- [close()](https://github.com/orbitdb/orbit-db/blob/master/API.md#storeclose)
- [drop()](https://github.com/orbitdb/orbit-db/blob/master/API.md#storedrop)
- [key](https://github.com/orbitdb/orbit-db/blob/master/API.md#storekey)
- [type](https://github.com/orbitdb/orbit-db/blob/master/API.md#storetype)
**[Store Events](https://github.com/orbitdb/orbit-db/blob/master/API.md#storeevents)**
- [replicated](https://github.com/orbitdb/orbit-db/blob/master/API.md#replicated)
- [replicate](https://github.com/orbitdb/orbit-db/blob/master/API.md#replicate)
- [replicate.progress](https://github.com/orbitdb/orbit-db/blob/master/API.md#replicateprogress)
- [load](https://github.com/orbitdb/orbit-db/blob/master/API.md#load-1)
- [load.progress](https://github.com/orbitdb/orbit-db/blob/master/API.md#loadprogress)
- [ready](https://github.com/orbitdb/orbit-db/blob/master/API.md#ready)
- [write](https://github.com/orbitdb/orbit-db/blob/master/API.md#write)

### Custom Store Types

You can add custom store types to OrbitDB:

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

## Examples

### Install dependencies

```
git clone https://github.com/orbitdb/orbit-db.git
cd orbit-db
npm install
```

You'll also need babel and webpack, if you don't have them installed already:

```
npm install --global babel-cli
npm install --global webpack
```

Some dependencies depend on native addon modules, so you'll also need to meet [node-gyp's](https://github.com/nodejs/node-gyp#installation) installation prerequisites. Therefore, Linux users may need to
```
make clean && make
```
to redo the local package-lock.json with working native dependencies.

### Browser example

In macOS:
```
npm run build
npm run examples:browser-macos
```

In Linux:
```
npm run build
npm run examples:browser-linux
```

<p align="left">
  <img src="https://raw.githubusercontent.com/orbitdb/orbit-db/master/screenshots/example1.png" width="33%">
</p>

Check the code in [examples/browser/browser.html](https://github.com/orbitdb/orbit-db/blob/master/examples/browser/browser.html) and try the [live example](https://ipfs.io/ipfs/QmRosp97r8GGUEdj5Wvivrn5nBkuyajhRXFUcWCp5Zubbo/).

### Node.js example

```
npm run examples:node
```

<img src="https://raw.githubusercontent.com/orbitdb/orbit-db/master/screenshots/orbit-db-demo3.gif" width="66%">

**Eventlog**

See the code in [examples/eventlog.js](https://github.com/orbitdb/orbit-db/blob/master/examples/eventlog.js) and run it with:
```
node examples/eventlog.js
```

More examples at [examples](https://github.com/orbitdb/orbit-db/tree/master/examples).

## Packages

OrbitDB uses the following modules:

- [ipfs](https://github.com/ipfs/js-ipfs)
- [ipfs-log](https://github.com/orbitdb/ipfs-log)
- [ipfs-pubub-room](https://github.com/ipfs-shipyard/ipfs-pubsub-room)
- [crdts](https://github.com/orbitdb/crdts)
- [orbit-db-cache](https://github.com/orbitdb/orbit-db-cache)
- [orbit-db-pubsub](https://github.com/orbitdb/orbit-db-pubsub)
- [orbit-db-keystore](https://github.com/orbitdb/orbit-db-keystore)

##### OrbitDB Store Packages
- [orbit-db-store](https://github.com/orbitdb/orbit-db-store)
- [orbit-db-eventstore](https://github.com/orbitdb/orbit-db-eventstore)
- [orbit-db-feedstore](https://github.com/orbitdb/orbit-db-feedstore)
- [orbit-db-kvstore](https://github.com/orbitdb/orbit-db-kvstore)
- [orbit-db-docstore](https://github.com/orbitdb/orbit-db-docstore)
- [orbit-db-counterstore](https://github.com/orbitdb/orbit-db-counterstore)

To understand a little bit about the architecture, check out a visualization of the data flow at https://github.com/haadcode/proto2 or a live demo: http://celebdil.benet.ai:8080/ipfs/Qmezm7g8mBpWyuPk6D84CNcfLKJwU6mpXuEN5GJZNkX3XK/.

## Development

#### Run Tests
```
npm test
```

#### Build
```
npm run build
```

#### Benchmark
```
node benchmarks/benchmark-add.js
```

See [benchmarks/](https://github.com/orbitdb/orbit-db/tree/master/benchmarks) for more benchmarks.

#### Logging

To enable OrbitDB's logging output, set a global ENV variable called `LOG` to `debug`,`warn` or `error`:

```
LOG=debug node <file>
```

## Contributing

We would be happy to accept PRs! If you want to work on something, it'd be good to talk beforehand to make sure nobody else is working on it. You can reach us on IRC [#orbitdb](http://webchat.freenode.net/?channels=%23orbitdb) on Freenode, or in the comments of the [issues section](https://github.com/orbitdb/orbit-db/issues).

A good place to start are the issues labelled ["help wanted"](https://github.com/orbitdb/orbit-db/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22+sort%3Areactions-%2B1-desc) or the project's [status board](https://waffle.io/orbitdb/orbit-db).

## Sponsors

The development of OrbitDB has been sponsored by:

* [Protocol Labs](https://protocol.ai/)

If you want to sponsor developers to work on OrbitDB, please reach out to @haadcode.

## License

[MIT](LICENSE) ©️ 2017 Haadcode
