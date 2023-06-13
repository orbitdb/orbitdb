# OrbitDB

<p align="left">
  <img src="images/orbit_db_logo_color.png" width="256" />
</p>

[![Matrix](https://img.shields.io/matrix/orbit-db:matrix.org?label=chat%20on%20matrix)](https://app.element.io/#/room/#orbit-db:matrix.org) [![npm version](https://badge.fury.io/js/orbit-db.svg)](https://www.npmjs.com/package/orbit-db) [![node](https://img.shields.io/node/v/orbit-db.svg)](https://www.npmjs.com/package/orbit-db)

OrbitDB is a **serverless, distributed, peer-to-peer database**. OrbitDB uses [IPFS](https://ipfs.tech) as its data storage and [Libp2p Pubsub](https://docs.libp2p.io/concepts/pubsub/overview/) to automatically sync databases with peers. It's an eventually consistent database that uses [Merkle-CRDTs](https://arxiv.org/abs/2004.00107) for conflict-free database writes and merges making OrbitDB an excellent choice for p2p and decentralized apps, blockchain applications and [local-first](https://www.inkandswitch.com/local-first/) web applications.

**Test it live at [Live demo 1](https://ipfs.io/ipfs/QmUsoSkGzUQnCgzfjL549KKf29m5EMYky3Y6gQp5HptLTG/), [Live demo 2](https://ipfs.io/ipfs/QmasHFRj6unJ3nSmtPn97tWDaQWEZw3W9Eh3gUgZktuZDZ/), or [P2P TodoMVC app](https://ipfs.io/ipfs/QmVWQMLUM3o4ZFbLtLMS1PMLfodeEeBkBPR2a2R3hqQ337/)**!


OrbitDB provides various types of databases for different data models and use cases:

- **[events](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdblognameaddress)**: an immutable (append-only) log with traversable history. Useful for *"latest N"* use cases or as a message queue.
- **[documents](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbdocsnameaddress-options)**: a document database to which JSON documents can be stored and indexed by a specified key. Useful for building search indices or version controlling documents and data.
- **[keyvalue](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbkeyvaluenameaddress)**: a key-value database just like your favourite key-value database.
- **[keyvalue-indexed](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbkeyvaluenameaddress)**: key-value data indexed in a Level key-value database.

All databases are [implemented](https://github.com/orbitdb/orbit-db-store) on top of [ipfs-log](https://github.com/orbitdb/ipfs-log), an immutable, cryptographically verifiable, operation-based conflict-free replicated data structure ([CRDT](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)) for distributed systems. ipfs-log is formalized in the paper [Merkle-CRDTs](https://arxiv.org/abs/2004.00107). You can also easily extend OrbitDB by [implementing and using a custom data model](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md#custom-stores) benefitting from the same properties as the default data models provided by the underlying Merkle-CRDTs.

#### Project status & support

* Status: **in active development**
* Compatible with **ipfs-core versions >= 0.18.0**

***NOTE!*** *js-ipfs and related packages are now superseded by IPFS's Helia project and are no longer being maintained. As part of this migration, OrbitDB will be [switching to Helia](./tree/helia).*

***NOTE!*** *OrbitDB is **alpha-stage** software. It means OrbitDB hasn't been security audited and programming APIs and data formats can still change. We encourage you to [reach out to the maintainers](https://app.element.io/#/room/#orbit-db:matrix.org) if you plan to use OrbitDB in mission critical systems.*

This is the Javascript implementation and it works both in **Browsers** and **Node.js** with support for Linux, OS X, and Windows. Node version 16 is supported.

A Go implementation is developed and maintained by the [Berty](https://github.com/berty) project at [berty/go-orbit-db](https://github.com/berty/go-orbit-db).

## Table of Contents

<!-- toc -->

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Database browser UI](#database-browser-ui)
- [Examples](#examples)
  * [Install dependencies](#install-dependencies)
  * [Browser example](#browser-example)
  * [Node.js example](#nodejs-example)
  * [Workshop](#workshop)
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

## Installation

```
npm install orbit-db
```

## Usage

If you're using `orbit-db` to develop **browser** or **Node.js** applications, use it as a module with the javascript instance of IPFS.

```javascript
import IPFS from 'ipfs-core'
import OrbitDB from 'orbit-db'

;(async function () {
  const ipfs = await IPFS.create()
  const orbitdb = await OrbitDB({ ipfs })

  // Create / Open a database. Defaults to db type "events".
  const db = await orbitdb.open("hello")
  
  const address = db.address
  console.log(address)
  // "/orbitdb/hash"
  // The above address can be used on another peer to open the same database

  // Listen for updates from peers
  db.events.on("update", entry => {
    console.log(entry)
    const all = await db.all()
    console.log(all)
  })

  // Add an entry
  const hash = await db.add("world")
  console.log(hash)

  // Query
  for await (const record of db.iterator()) {
    console.log(record)
  }
  
  await db.close()
  await orbitdb.stop()
})()
```

Use the **[Getting Started](./docs/GETTING_STARTED.md)** guide for an initial introduction to OrbitDB and you can find more advanced topics covered in our [docs](./docs).

## API

See [API.md](https://github.com/orbitdb/orbit-db/blob/master/API.md) for the full documentation.

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

## Development

### Run Tests
```
npm run test
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
