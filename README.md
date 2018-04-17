# OrbitDB

[![](https://img.shields.io/badge/freenode-%23orbitdb-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23orbitdb)
[![CircleCI Status](https://circleci.com/gh/orbitdb/orbit-db.svg?style=shield)](https://circleci.com/gh/orbitdb/orbit-db)
[![npm version](https://badge.fury.io/js/orbit-db.svg)](https://www.npmjs.com/package/orbit-db)
[![node](https://img.shields.io/node/v/orbit-db.svg)](https://www.npmjs.com/package/orbit-db)
[![Project Status](https://badge.waffle.io/orbitdb/orbit-db.svg?columns=In%20Progress&title=In%20Progress)](https://waffle.io/orbitdb/orbit-db)

> A peer-to-peer database for the decentralized web

OrbitDB is a serverless, distributed, peer-to-peer database. OrbitDB uses [IPFS](https://ipfs.io) as its data storage and [IPFS Pubsub](https://github.com/ipfs/go-ipfs/blob/master/core/commands/pubsub.go#L23) to automatically sync databases with peers. It's an eventually consistent database that uses [CRDTs](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type) for conflict-free database merges making OrbitDB an excellent choice for decentralized apps (dApps), blockchain applications and offline-first web applications.

Data in OrbitDB can be stored in a

- **[Key-Value Store](https://github.com/orbitdb/orbit-db/blob/master/API.md#keyvaluenameaddress)**
- **[Log Database](https://github.com/orbitdb/orbit-db/blob/master/API.md#lognameaddress)** (append-only log)
- **[Feed](https://github.com/orbitdb/orbit-db/blob/master/API.md#feednameaddress)** (same as log database but entries can be removed)
- **[Document Store](https://github.com/orbitdb/orbit-db/blob/master/API.md#docsnameaddress-options)** (store indexed JSON documents)
- **[Counters](https://github.com/orbitdb/orbit-db/blob/master/API.md#counternameaddress)**

This is the Javascript implementation and it works both in **Node.js** and **Browsers**.

To get started, try the **[OrbitDB CLI](https://github.com/orbitdb/orbit-db-cli)**, read the **[Getting Started Guide](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md)** or check **[Live demo 1](https://ipfs.io/ipfs/QmeESXh9wPib8Xz7hdRzHuYLDuEUgkYTSuujZ2phQfvznQ/)**, **[Live demo 2](https://ipfs.io/ipfs/QmasHFRj6unJ3nSmtPn97tWDaQWEZw3W9Eh3gUgZktuZDZ/)** or **[P2P TodoMVC app](https://ipfs.io/ipfs/QmTJGHccriUtq3qf3bvAQUcDUHnBbHNJG2x2FYwYUecN43/)**!

<p align="left">
  <img src="https://raw.githubusercontent.com/orbitdb/orbit-db/master/screenshots/example1.png" width="28%">
  <a href="https://asciinema.org/a/JdTmmdBCZarkBkPqbueicwMrG" target="_blank"><img src="https://asciinema.org/a/JdTmmdBCZarkBkPqbueicwMrG.png" width="50%"/></a>
</p>

## Table of Contents

- [Usage](#usage)
- [API](#api)
- [Examples](#examples)
- [Development](#development)
- [Background](#background)
- [Contributing](#contributing)
- [License](#license)

## Usage

Read the **[GETTING STARTED](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md)** guide for a more in-depth tutorial and to understand how OrbitDB works.

OrbitDB currently supports Linux and OS X, Windows is not supported yet.

### CLI

For the CLI tool to manage orbit-db database, see **[OrbitDB CLI](https://github.com/orbitdb/orbit-db-cli)**.

It can be installed from Npm with:

```
npm install orbit-db-cli -g
```

### As a library

Install dependencies:

```
npm install orbit-db ipfs
```

Use it as a module:

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
  },
}

// Create IPFS instance
const ipfs = new IPFS(ipfsOptions)

ipfs.on('error', (e) => console.error(e))
ipfs.on('ready', async () => {
  // Create a database
  const orbitdb = new OrbitDB(ipfs)
  const db = await orbitdb.log('database name')
  // Add an entry to the database
  const hash = await db.add('hello world')
  // Get last 5 entries
  const latest = db.iterator({ limit: 5 }).collect()
  console.log(JSON.stringify(latest, null, 2))
})
```

*For more details, see examples for [kvstore](https://github.com/orbitdb/orbit-db-kvstore#usage), [eventlog](https://github.com/haadcode/orbit-db-eventstore#usage), [feed](https://github.com/haadcode/orbit-db-feedstore#usage), [docstore](https://github.com/shamb0t/orbit-db-docstore#usage) and [counter](https://github.com/haadcode/orbit-db-counterstore#usage).*

*The minimum required version of Node.js is now 8.0.0. To use with older versions of Node.js, we provide an ES5-compatible build through the npm package, located in `dist/es5/` when installed through npm.*

## API

See [API documentation](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbit-db-api-documentation) for the full documentation.

- [Getting Started](https://github.com/orbitdb/orbit-db/blob/master/API.md#getting-started)
- [OrbitDB](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdb)
  - [keyvalue](https://github.com/orbitdb/orbit-db/blob/master/API.md#keyvaluenameaddress)
  - [log](https://github.com/orbitdb/orbit-db/blob/master/API.md#lognameaddress)
  - [feed](https://github.com/orbitdb/orbit-db/blob/master/API.md#feednameaddress)
  - [docstore](https://github.com/orbitdb/orbit-db/blob/master/API.md#docsnameaddress-options)
  - [counter](https://github.com/orbitdb/orbit-db/blob/master/API.md#counternameaddress)
  - [common](https://github.com/orbitdb/orbit-db/blob/master/API.md#store)

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

See [benchmarks/]() for more benchmarks.

#### Logging

To enable OrbitDB's logging output, set a global ENV variable called `LOG` to `debug`,`warn` or `error`:

```
LOG=debug node <file>
```

## Background

Uses the following modules:

- [ipfs-log](https://github.com/orbitdb/ipfs-log)
- [crdts](https://github.com/orbitdb/crdts)
- [orbit-db-cache](https://github.com/orbitdb/orbit-db-cache)
- [orbit-db-store](https://github.com/orbitdb/orbit-db-store)
- [orbit-db-eventstore](https://github.com/orbitdb/orbit-db-eventstore)
- [orbit-db-feedstore](https://github.com/orbitdb/orbit-db-feedstore)
- [orbit-db-kvstore](https://github.com/orbitdb/orbit-db-kvstore)
- [orbit-db-docstore](https://github.com/orbitdb/orbit-db-docstore)
- [orbit-db-counterstore](https://github.com/orbitdb/orbit-db-counterstore)
- [orbit-db-pubsub](https://github.com/orbitdb/orbit-db-pubsub)
- [orbit-db-keystore](https://github.com/orbitdb/orbit-db-keystore)
- [ipfs](https://github.com/ipfs/js-ipfs)
- [ipfs-pubub-room](https://github.com/ipfs-shipyard/ipfs-pubsub-room)

To understand a little bit about the architecture, check out a visualization of the data flow at https://github.com/haadcode/proto2 or a live demo: http://celebdil.benet.ai:8080/ipfs/Qmezm7g8mBpWyuPk6D84CNcfLKJwU6mpXuEN5GJZNkX3XK/.

## Contributing

We would be happy to accept PRs! If you want to work on something, it'd be good to talk beforehand to make sure nobody else is working on it. You can reach us on IRC [#orbitdb](http://webchat.freenode.net/?channels=%23orbitdb) on Freenode, or in the comments of the [issues section](https://github.com/orbitdb/orbit-db/issues).

A good place to start are the issues labelled ["help wanted"](https://github.com/orbitdb/orbit-db/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22+sort%3Areactions-%2B1-desc) or the project's [status board](https://waffle.io/orbitdb/orbit-db).

## Sponsors

The development of OrbitDB has been sponsored by:

* [Protocol Labs](https://protocol.ai/)

If you want to sponsor developers to work on OrbitDB, please reach out to @haadcode.

## License

[MIT](LICENSE) ©️ 2017 Haadcode
