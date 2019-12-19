# OrbitDB

<p align="left">
  <img src="images/orbit_db_logo_color.jpg" width="256" />
</p>

[![Gitter](https://img.shields.io/gitter/room/nwjs/nw.js.svg)](https://gitter.im/orbitdb/Lobby) [![Matrix](https://img.shields.io/badge/matrix-%23orbitdb%3Apermaweb.io-blue.svg)](https://riot.permaweb.io/#/room/#orbitdb:permaweb.io) [![Discord](https://img.shields.io/discord/475789330380488707?color=blueviolet&label=discord)](https://discord.gg/v3RNE3M) [![CircleCI Status](https://circleci.com/gh/orbitdb/orbit-db.svg?style=shield)](https://circleci.com/gh/orbitdb/orbit-db) [![npm version](https://badge.fury.io/js/orbit-db.svg)](https://www.npmjs.com/package/orbit-db) [![node](https://img.shields.io/node/v/orbit-db.svg)](https://www.npmjs.com/package/orbit-db)

OrbitDB is a **serverless, distributed, peer-to-peer database**. OrbitDB uses [IPFS](https://ipfs.io) as its data storage and [IPFS Pubsub](https://github.com/ipfs/go-ipfs/blob/master/core/commands/pubsub.go#L23) to automatically sync databases with peers. It's an eventually consistent database that uses [CRDTs](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type) for conflict-free database merges making OrbitDB an excellent choice for decentralized apps (dApps), blockchain applications and offline-first web applications.

**Test it live at [Live demo 1](https://ipfs.io/ipfs/QmeESXh9wPib8Xz7hdRzHuYLDuEUgkYTSuujZ2phQfvznQ/), [Live demo 2](https://ipfs.io/ipfs/QmasHFRj6unJ3nSmtPn97tWDaQWEZw3W9Eh3gUgZktuZDZ/), or [P2P TodoMVC app](https://ipfs.io/ipfs/QmTJGHccriUtq3qf3bvAQUcDUHnBbHNJG2x2FYwYUecN43/)**!


OrbitDB provides various types of databases for different data models and use cases:

- **[log](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdblognameaddress)**: an immutable (append-only) log with traversable history. Useful for *"latest N"* use cases or as a message queue.
- **[feed](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbfeednameaddress)**: a mutable log with traversable history. Entries can be added and removed. Useful for *"shopping cart"* type of use cases, or for example as a feed of blog posts or "tweets".
- **[keyvalue](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbkeyvaluenameaddress)**: a key-value database just like your favourite key-value database.
- **[docs](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbdocsnameaddress-options)**: a document database to which JSON documents can be stored and indexed by a specified key. Useful for building search indices or version controlling documents and data.
- **[counter](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbcounternameaddress)**: Useful for counting events separate from log/feed data.

All databases are [implemented](https://github.com/orbitdb/orbit-db-store) on top of [ipfs-log](https://github.com/orbitdb/ipfs-log), an immutable, operation-based conflict-free replicated data structure (CRDT) for distributed systems. If none of the OrbitDB database types match your needs and/or you need case-specific functionality, you can easily [implement and use a custom database store](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md#custom-stores) of your own.

#### Project status & support

Status: **in active development**

***NOTE!*** *OrbitDB is **alpha-stage** software. It means OrbitDB hasn't been security audited and programming APIs and data formats can still change. We encourage you to [reach out to the maintainers](https://gitter.im/orbitdb/Lobby) if you plan to use OrbitDB in mission critical systems.*

This is the Javascript implementation and it works both in **Browsers** and **Node.js** with support for Linux and OS X (Windows is not supported yet). The minimum required version of Node.js is now 8.6.0 due to the usage of `...` spread syntax. LTS versions (even numbered versions 8, 10, etc) are preferred.

To use with older versions of Node.js, we provide an ES5-compatible build through the npm package, located in `dist/es5/` when installed through npm.

#### Community Calls
We also have regular community calls, which we announce in the issues in [the @orbitdb welcome repository](https://github.com/orbitdb/welcome/issues). Join us!

## Table of Contents

<!-- toc -->

- [Usage](#usage)
  * [CLI](#cli)
  * [Module with IPFS Instance](#module-with-ipfs-instance)
  * [Module with IPFS Daemon](#module-with-ipfs-daemon)
- [API](#api)
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

### CLI

For the CLI tool to manage orbit-db database, see **[OrbitDB CLI](https://github.com/orbitdb/orbit-db-cli)**.

It can be installed from npm with:

```
npm install orbit-db-cli -g
```

### Module with IPFS Instance

If you're using `orbit-db` to develop **browser** or **Node.js** applications, use it as a module with the javascript instance of IPFS

Install dependencies:

```
npm install orbit-db ipfs
```

```javascript
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

// Create IPFS instance

// For js-ipfs >= 0.38
const ipfs = new IPFS()

// For js-ipfs < 0.38
const ipfsOptions = {
  EXPERIMENTAL: {
    pubsub: true
  }
}
const ipfs = new IPFS(ipfsOptions)

ipfs.on('error', (e) => console.error(e))
ipfs.on('ready', async () => {
  const orbitdb = await OrbitDB.createInstance(ipfs)

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
npm install orbit-db ipfs-http-client
```

```javascript
const IpfsClient = require('ipfs-http-client')
const OrbitDB = require('orbit-db')

const ipfs = IpfsClient('localhost', '5001')

const orbitdb = await OrbitDB.createInstance(ipfs)
const db = await orbitdb.log('hello')
// Do something with your db.
// Of course, you may want to wrap these in an async function.
```

## API

See [API.md](https://github.com/orbitdb/orbit-db/blob/master/API.md) for the full documentation.

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
- [ipfs-pubsub-room](https://github.com/ipfs-shipyard/ipfs-pubsub-room)
- [crdts](https://github.com/orbitdb/crdts)
- [orbit-db-cache](https://github.com/orbitdb/orbit-db-cache)
- [orbit-db-pubsub](https://github.com/orbitdb/orbit-db-pubsub)
- [orbit-db-identity-provider](https://github.com/orbitdb/orbit-db-identity-provider)
- [orbit-db-access-controllers](https://github.com/orbitdb/orbit-db-access-controllers)

### OrbitDB Store Packages
- [orbit-db-store](https://github.com/orbitdb/orbit-db-store)
- [orbit-db-eventstore](https://github.com/orbitdb/orbit-db-eventstore)
- [orbit-db-feedstore](https://github.com/orbitdb/orbit-db-feedstore)
- [orbit-db-kvstore](https://github.com/orbitdb/orbit-db-kvstore)
- [orbit-db-docstore](https://github.com/orbitdb/orbit-db-docstore)
- [orbit-db-counterstore](https://github.com/orbitdb/orbit-db-counterstore)

To understand a little bit about the architecture, check out a visualization of the data flow at https://github.com/haadcode/proto2 or a live demo: http://celebdil.benet.ai:8080/ipfs/Qmezm7g8mBpWyuPk6D84CNcfLKJwU6mpXuEN5GJZNkX3XK/.

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

The best place to find out what is out there and what is being actively worked on is likely by asking in the [Gitter](https://gitter.im/orbitdb/Lobby). If you know of any other repos that ought to be included in this section, please open a PR and add them.

## Contributing

**Take a look at our organization-wide [Contributing Guide](https://github.com/orbitdb/welcome/blob/master/contributing.md).** You'll find most of your questions answered there. Some questions may be answered in the [FAQ](FAQ.md), as well.

As far as code goes, we would be happy to accept PRs! If you want to work on something, it'd be good to talk beforehand to make sure nobody else is working on it. You can reach us [on Gitter](https://gitter.im/orbitdb/Lobby), or in the [issues section](https://github.com/orbitdb/orbit-db/issues).

We also have **regular community calls**, which we announce in the issues in [the @orbitdb welcome repository](https://github.com/orbitdb/welcome/issues). Join us!

If you want to code but don't know where to start, check out the issues labelled ["help wanted"](https://github.com/orbitdb/orbit-db/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22+sort%3Areactions-%2B1-desc).

Please note that we have a [Code of Conduct](CODE_OF_CONDUCT.md), and that all activity in the [@orbitdb](https://github.com/orbitdb) organization falls under it. Read it when you get the chance, as being part of this community means that you agree to abide by it. Thanks.

## Sponsors

The development of OrbitDB has been sponsored by:

* [Haja Networks](https://haja.io)
* [Protocol Labs](https://protocol.ai/)
* [Maintainer Mountaineer](https://maintainer.io)

If you want to sponsor developers to work on OrbitDB, please reach out to [@haadcode](https://github.com/haadcode).

## License

[MIT](LICENSE) © 2015-2019 Protocol Labs Inc., Haja Networks Oy
