# orbit-db

[![npm version](https://badge.fury.io/js/orbit-db.svg)](https://badge.fury.io/js/orbit-db)
[![CircleCI Status](https://circleci.com/gh/haadcode/orbit-db.svg?style=shield)](https://circleci.com/gh/haadcode/orbit-db)
[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![Project Status](https://badge.waffle.io/haadcode/orbit.svg?label=In%20Progress&title=In%20Progress)](https://waffle.io/haadcode/orbit?source=haadcode%2Forbit-db,haadcode%2Forbit-db-counterstore,haadcode%2Forbit-db-eventstore,haadcode%2Forbit-db-feedstore,haadcode%2Forbit-db-kvstore,haadcode%2Forbit-db-store,haadcode%2Fipfs-log)

> Distributed, peer-to-peer database on IPFS.

`orbit-db` is a serverless, distributed, peer-to-peer database. `orbit-db` uses [IPFS](https://ipfs.io) as its data storage and [IPFS Pubsub](https://github.com/ipfs/go-ipfs/blob/master/core/commands/pubsub.go#L23) to automatically sync databases with peers. It's an eventually consistent database that uses [CRDTs](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type) for conflict-free database merges making `orbit-db` and excellent choice for offline-first applications.

Data in `orbit-db` can be stored in a

- **[Key-Value Store](https://github.com/haadcode/orbit-db-kvstore)**
- **[Eventlog](https://github.com/haadcode/orbit-db-eventstore)** (append-only log)
- **[Feed](https://github.com/haadcode/orbit-db-feedstore)** (add and remove log)
- **[Documents](https://github.com/shamb0t/orbit-db-docstore)** (indexed by custom fields)
- **[Counters](https://github.com/haadcode/orbit-db-counterstore)**

This is the Javascript implementation and it works both in **Node.js** and **Browsers**.

Try the [live demo](https://ipfs.io/ipfs/QmUETzzv9FxBwPn4H6q3i6QXTzicvV3MMuKN53JQU3yMSG/)!

## Table of Contents

- [Usage](#usage)
- [API](#api)
- [Examples](#examples)
- [Development](#development)
- [Background](#background)
- [Contributing](#contributing)
- [License](#license)

## Usage

```
npm install orbit-db ipfs-daemon
```

```javascript
const IPFS = require('ipfs-daemon/src/ipfs-node-daemon')
const OrbitDB = require('orbit-db')

const ipfs = new IPFS()

ipfs.on('error', (e) => console.error(e))
ipfs.on('ready', (e) => {
  const orbitdb = new OrbitDB(ipfs)

  const db = orbitdb.eventlog("feed name")

  db.add("hello world")
    .then(() => {
      const latest = db.iterator({ limit: 5 }).collect()
      console.log(JSON.stringify(latest, null, 2))
    })  
})
```

*For more details, see examples for [kvstore](https://github.com/haadcode/orbit-db-kvstore#usage), [eventlog](https://github.com/haadcode/orbit-db-eventstore#usage), [feed](https://github.com/haadcode/orbit-db-feedstore#usage), [docstore](https://github.com/shamb0t/orbit-db-docstore#usage) and [counter](https://github.com/haadcode/orbit-db-counterstore#usage).*

## API

See [API documentation](https://github.com/haadcode/orbit-db/blob/master/API.md#orbit-db-api-documentation) for the full documentation.

- [Getting Started](https://github.com/haadcode/orbit-db/blob/master/API.md#getting-started)
- [orbitdb](https://github.com/haadcode/orbit-db/blob/master/API.md#orbitdb)
  - [kvstore(name)](https://github.com/haadcode/orbit-db/blob/master/API.md#kvstorename)
  - [eventlog(name)](https://github.com/haadcode/orbit-db/blob/master/API.md#eventlogname)
  - [feed(name)](https://github.com/haadcode/orbit-db/blob/master/API.md#feedname)
  - [docstore(name, options)](https://github.com/haadcode/orbit-db/blob/master/API.md#docstorename-options)
  - [counter(name)](https://github.com/haadcode/orbit-db/blob/master/API.md#countername)
  - [disconnect()](https://github.com/haadcode/orbit-db/blob/master/API.md#disconnect)
  - [events](https://github.com/haadcode/orbit-db/blob/master/API.md#events)

## Examples

### Install dependencies

```
git clone https://github.com/haadcode/orbit-db.git
cd orbit-db
npm install
```

### Browser example

```
npm run build:examples
npm run examples:browser
```

<img src="https://raw.githubusercontent.com/haadcode/orbit-db/feat/ipfs-pubsub/screenshots/orbit-db-demo1.gif" width="33%">

Check the code in [examples/browser/browser.html](https://github.com/haadcode/orbit-db/blob/master/examples/browser/browser.html).

### Node.js example

```
npm run examples:node
```

<img src="https://raw.githubusercontent.com/haadcode/orbit-db/feat/ipfs-pubsub/screenshots/orbit-db-demo3.gif" width="66%">

**Eventlog**

Check the code in [examples/eventlog.js](https://github.com/haadcode/orbit-db/blob/master/examples/eventlog.js) and run it with:
```
LOG=debug node examples/eventlog.js
```

**Key-Value**

Check the code in [examples/keyvalue.js](https://github.com/haadcode/orbit-db/blob/master/examples/keystore.js) and run it with:
```
LOG=debug node examples/keyvalue.js
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
node examples/benchmark.js
```

## Background

Check out a visualization of the data flow at https://github.com/haadcode/proto2 or a live demo: http://celebdil.benet.ai:8080/ipfs/Qmezm7g8mBpWyuPk6D84CNcfLKJwU6mpXuEN5GJZNkX3XK/.

**TODO**

- list of modules used
- orbit-db-pubsub
- crdts
- ipfs-log

## Contributing

[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)

I would be happy to accept PRs! If you want to work on something, it'd be good to talk beforehand to make sure nobody else is working on it. You can reach me on Twitter [@haadcode](https://twitter.com/haadcode) or on IRC #ipfs on Freenode, or in the comments of the [issues section](https://github.com/haadcode/orbit-db/issues).

A good place to start are the issues labelled ["help wanted"](https://github.com/haadcode/orbit-db/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22+sort%3Areactions-%2B1-desc) or the project's [status board](https://waffle.io/haadcode/orbit-db).

## License

[MIT](LICENSE) ©️ 2016 Haadcode
