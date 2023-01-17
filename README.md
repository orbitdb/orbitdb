# OrbitDB

<p align="left">
  <img src="images/orbit_db_logo_color.png" width="256" />
</p>

[![Matrix](https://img.shields.io/matrix/orbit-db:matrix.org?label=chat%20on%20matrix)](https://app.element.io/#/room/#orbit-db:matrix.org) [![npm version](https://badge.fury.io/js/orbit-db.svg)](https://www.npmjs.com/package/orbit-db) [![node](https://img.shields.io/node/v/orbit-db.svg)](https://www.npmjs.com/package/orbit-db)

OrbitDB is a **serverless, distributed, peer-to-peer database**. OrbitDB uses [IPFS](https://ipfs.tech) as its data storage and [Libp2p Pubsub](https://docs.libp2p.io/concepts/pubsub/overview/) to automatically sync databases with peers. It's an eventually consistent database that uses [Merkle-CRDTs](https://arxiv.org/abs/2004.00107) for conflict-free database writes and merges making OrbitDB an excellent choice for p2p and decentralized apps, blockchain applications and [local-first](https://www.inkandswitch.com/local-first/) web applications.

**Test it live at [Live demo 1](https://ipfs.io/ipfs/QmUsoSkGzUQnCgzfjL549KKf29m5EMYky3Y6gQp5HptLTG/), [Live demo 2](https://ipfs.io/ipfs/QmasHFRj6unJ3nSmtPn97tWDaQWEZw3W9Eh3gUgZktuZDZ/), or [P2P TodoMVC app](https://ipfs.io/ipfs/QmVWQMLUM3o4ZFbLtLMS1PMLfodeEeBkBPR2a2R3hqQ337/)**!


OrbitDB provides various types of databases for different data models and use cases:

- **[log](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdblognameaddress)**: an immutable (append-only) log with traversable history. Useful for *"latest N"* use cases or as a message queue.
- **[feed](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbfeednameaddress)**: a mutable log with traversable history. Entries can be added and removed. Useful for *"shopping cart"* type of use cases, or for example as a feed of blog posts or "tweets".
- **[keyvalue](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbkeyvaluenameaddress)**: a key-value database just like your favourite key-value database.
- **[docs](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbdocsnameaddress-options)**: a document database to which JSON documents can be stored and indexed by a specified key. Useful for building search indices or version controlling documents and data.
- **[counter](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbcounternameaddress)**: Useful for counting events separate from log/feed data.

All databases are [implemented](https://github.com/orbitdb/orbit-db-store) on top of [ipfs-log](https://github.com/orbitdb/ipfs-log), an immutable, cryptographically verifiable, operation-based conflict-free replicated data structure ([CRDT](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)) for distributed systems. ipfs-log is formalized in the paper [Merkle-CRDTs](https://arxiv.org/abs/2004.00107). You can also easily extend OrbitDB by [implementing and using a custom data model](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md#custom-stores) benefitting from the same properties as the default data models provided by the underlying Merkle-CRDTs.

#### Project status & support

* Status: **in active development**
* Compatible with **js-ipfs versions >= 0.66.0** and **go-ipfs versions >= 0.17.0**

***NOTE!*** *OrbitDB is **alpha-stage** software. It means OrbitDB hasn't been security audited and programming APIs and data formats can still change. We encourage you to [reach out to the maintainers](https://app.element.io/#/room/#orbit-db:matrix.org) if you plan to use OrbitDB in mission critical systems.*

This is the Javascript implementation and it works both in **Browsers** and **Node.js** with support for Linux, OS X, and Windows. Node version 16 is supported.

A Go implementation is developed and maintained by the [Berty](https://github.com/berty) project at [berty/go-orbit-db](https://github.com/berty/go-orbit-db).

## Table of Contents

<!-- toc -->

- [Usage](#usage)
  * [Module with IPFS Instance](#module-with-ipfs-instance)
  * [Module with IPFS Daemon](#module-with-ipfs-daemon)
- [API](#api)
- [Database browser UI](#database-browser-ui)
- [Examples](#examples)
  * [Install dependencies](#install-dependencies)
  * [Browser example](#browser-example)
  * [Node.js example](#nodejs-example)
  * [Workshop](#workshop)
- [Packages](#packages)
  * [OrbitDB Store Packages](#orbitdb-store-packages)
- [Development](#development)
  * [Run Tests](#run-tests)
  * [Build](#build)
  * [Benchmark](#benchmark)
  * [Logging](#logging)
- [Frequently Asked Questions](#frequently-asked-questions)
  * [Are there implementations in other languages?](#are-there-implementations-in-other-languages)
- [Contributing](#contributing)
- [Sponsors](#sponsors)
- [License](#license)

<!-- tocstop -->

## Usage

Read the **[GETTING STARTED](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md)** guide for a quick tutorial on how to use OrbitDB.

For a more in-depth tutorial and exploration of OrbitDB's architecture, please check out the **[OrbitDB Field Manual](https://github.com/orbitdb/field-manual)**.

### Module with IPFS Instance

If you're using `orbit-db` to develop **browser** or **Node.js** applications, use it as a module with the javascript instance of IPFS

Install dependencies:

```
npm install orbit-db ipfs
```


```javascript
import IPFS from 'ipfs'
import OrbitDB from 'orbit-db'

;(async function () {
  const ipfs = await IPFS.create()
  const orbitdb = await OrbitDB.createInstance(ipfs)

  // Create / Open a database
  const db = await orbitdb.log("hello")
  await db.load()

  // Listen for updates from peers
  db.events.on("replicated", address => {
    console.log(db.iterator({ limit: -1 }).collect())
  })

  // Add an entry
  const hash = await db.add("world")
  console.log(hash)

  // Query
  const result = db.iterator({ limit: -1 }).collect()
  console.log(JSON.stringify(result, null, 2))
})()
```

### Module with IPFS Daemon

Alternatively, you can use [ipfs-http-client](https://www.npmjs.com/package/ipfs-http-client) to use `orbit-db` with a locally running IPFS daemon. Use this method if you're using `orbitd-db` to develop **backend** or **desktop** applications, eg. with [Electron](https://electron.atom.io).

Install dependencies:

```
npm install orbit-db ipfs-http-client
```

```javascript
import { create } from 'ipfs-http-client'
import OrbitDB from 'orbit-db'

const ipfs = create(new URL('http://localhost:5001'))

const orbitdb = await OrbitDB.createInstance(ipfs)
const db = await orbitdb.log('hello')
// Do something with your db.
// Of course, you may want to wrap these in an async function.
```

## API

See [API.md](https://github.com/orbitdb/orbit-db/blob/master/API.md) for the full documentation.

## Database browser UI

OrbitDB databases can easily be managed using a web UI, see **[OrbitDB Control Center](https://github.com/orbitdb/orbit-db-control-center)**.

Install and run it locally:

```
git clone https://github.com/orbitdb/orbit-db-control-center.git
cd orbit-db-control-center/
npm i && npm start
```

## Examples

### Install dependencies
```
git clone https://github.com/orbitdb/orbit-db.git
cd orbit-db
npm install
```
Some dependencies depend on native addon modules, so you'll also need to meet [node-gyp's](https://github.com/nodejs/node-gyp#installation) installation prerequisites. Therefore, Linux users may need to
```
make clean-dependencies && make deps
```
to redo the local package-lock.json with working native dependencies.

### Browser example

```
npm install # if not yet installed
make build
npm run examples:browser # if browser isn't opening, open examples/browser/browser.html in your browser
```

Using Webpack:
```
npm install # if not yet installed
make build
npm run examples:browser-webpack # if browser isn't opening, open examples/browser/browser-webpack-example/index.html in your browser
```

<p align="left">
  <img src="https://raw.githubusercontent.com/orbitdb/orbit-db/master/images/example1.png" width="33%">
</p>

Check the code in [examples/browser/browser.html](https://github.com/orbitdb/orbit-db/blob/master/examples/browser/browser.html) and try the [live example](https://ipfs.io/ipfs/QmRosp97r8GGUEdj5Wvivrn5nBkuyajhRXFUcWCp5Zubbo/).

### Node.js example

```
npm run examples:node
```

<img src="https://raw.githubusercontent.com/orbitdb/orbit-db/master/images/orbit-db-demo3.gif" width="66%">

**Eventlog**

See the code in [examples/eventlog.js](https://github.com/orbitdb/orbit-db/blob/master/examples/eventlog.js) and run it with:
```
node examples/eventlog.js
```

### Workshop

We have a field manual which has much more detailed examples and a run-through of how to understand OrbitDB, at [orbitdb/field-manual](https://github.com/orbitdb/field-manual). There is also a workshop you can follow, which shows how to build an app, at [orbit-db/web3-workshop](https://github.com/orbitdb/web3-workshop).

More examples at [examples](https://github.com/orbitdb/orbit-db/tree/master/examples).

## Packages

OrbitDB uses the following modules:

- [ipfs](https://github.com/ipfs/js-ipfs)
- [ipfs-log](https://github.com/orbitdb/ipfs-log)
- [crdts](https://github.com/orbitdb/crdts)
- [ipfs-pubsub-1on1](https://github.com/orbitdb/ipfs-pubsub-1on1)
- [orbit-db-pubsub](https://github.com/orbitdb/orbit-db-pubsub)
- [orbit-db-cache](https://github.com/orbitdb/orbit-db-cache)
- [orbit-db-identity-provider](https://github.com/orbitdb/orbit-db-identity-provider)
- [orbit-db-access-controllers](https://github.com/orbitdb/orbit-db-access-controllers)

### OrbitDB Store Packages
- [orbit-db-store](https://github.com/orbitdb/orbit-db-store)
- [orbit-db-eventstore](https://github.com/orbitdb/orbit-db-eventstore)
- [orbit-db-feedstore](https://github.com/orbitdb/orbit-db-feedstore)
- [orbit-db-kvstore](https://github.com/orbitdb/orbit-db-kvstore)
- [orbit-db-docstore](https://github.com/orbitdb/orbit-db-docstore)
- [orbit-db-counterstore](https://github.com/orbitdb/orbit-db-counterstore)

Community-maintained Typescript typings are available here: https://github.com/orbitdb/orbit-db-types

## Development

### Run Tests
```
npm test
```

### Build
```
npm run build
```

### Benchmark
```
node benchmarks/benchmark-add.js
```

See [benchmarks/](https://github.com/orbitdb/orbit-db/tree/master/benchmarks) for more benchmarks.

### Logging

To enable OrbitDB's logging output, set a global ENV variable called `LOG` to `debug`,`warn` or `error`:

```
LOG=debug node <file>
```

## Frequently Asked Questions

We have an FAQ! [Go take a look at it](FAQ.md). If a question isn't there, open an issue and suggest adding it. We can work on the best answer together.

### Are there implementations in other languages?

Yes! Take a look at these implementations:

  - Golang: [berty/go-orbit-db](https://github.com/berty/go-orbit-db)
  - Python: [orbitdb/py-orbit-db-http-client](https://github.com/orbitdb/py-orbit-db-http-client)

The best place to find out what is out there and what is being actively worked on is likely by asking in the [Matrix](https://app.element.io/#/room/#orbit-db:matrix.org). If you know of any other repos that ought to be included in this section, please open a PR and add them.

## Contributing

**Take a look at our organization-wide [Contributing Guide](https://github.com/orbitdb/welcome/blob/master/contributing.md).** You'll find most of your questions answered there. Some questions may be answered in the [FAQ](FAQ.md), as well.

If you want to code but don't know where to start, check out the issues labelled ["help wanted"](https://github.com/orbitdb/orbit-db/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22+sort%3Areactions-%2B1-desc).

## Sponsors

The development of OrbitDB has been sponsored by:

* [Protocol Labs](https://protocol.ai/)
* [Haja Networks](https://haja.io)
* [Maintainer Mountaineer](https://maintainer.io)
* [OrbitDB Open Collective](https://opencollective.com/orbitdb)

If you want to sponsor developers to work on OrbitDB, please reach out to [@haadcode](https://github.com/haadcode).

## License

[MIT](LICENSE) © 2015-2023 Protocol Labs Inc., Haja Networks Oy, OrbitDB Community
