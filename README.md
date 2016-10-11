# orbit-db

> Distributed, peer-to-peer database on IPFS.

`orbit-db` is a serverless, distributed, peer-to-peer database. `orbit-db` uses [IPFS](https://ipfs.io) as its data storage and [IPFS Pubsub](https://github.com/ipfs/go-ipfs/blob/master/core/commands/pubsub.go) to automatically sync databases with peers. It's an eventually consistent database that uses [CRDTs](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type) for conflict-free database merges making `orbit-db` and excellent choice for offline-first applications.

Data in `orbit-db` can be stored in a

- **Key-Value Store**
- **Eventlog** (append-only log)
- **Feed** (add and remove log)
- **Documents** (indexed by custom fields)
- **Counters**

This is the Javascript implementation and it works both in **Node.js** and **Browsers**.

[![npm version](https://badge.fury.io/js/orbit-db.svg)](https://badge.fury.io/js/orbit-db)
[![CircleCI Status](https://circleci.com/gh/haadcode/orbit-db.svg?style=shield)](https://circleci.com/gh/haadcode/orbit-db)
[![Project Status](https://badge.waffle.io/haadcode/orbit.svg?label=In%20Progress&title=In%20Progress)](https://waffle.io/haadcode/orbit?source=haadcode%2Forbit-db,haadcode%2Forbit-db-counterstore,haadcode%2Forbit-db-eventstore,haadcode%2Forbit-db-feedstore,haadcode%2Forbit-db-kvstore,haadcode%2Forbit-db-store,haadcode%2Fipfs-log)

## Table of Contents

- [Usage](#usage)
- [API](#api)
- [Examples](#examples)
  - [Install dependencies](#install-dependencies)
  - [Browser example](#browser-example)
  - [Node.js example](#nodejs-example)
- [Development](#development)
    - [Run Tests](#run-tests)
    - [Build](#build)
    - [Benchmark](#benchmark)
- [Background](#background)
- [Contributing](#contributing)
- [License](#license)

## Usage
```
npm install orbit-db ipfs-api@https://github.com/haadcode/js-ipfs-api.git
```

```javascript
const IpfsApi = require('ipfs-api')
const OrbitDB = require('orbit-db')

const ipfs = IpfsApi('localhost', '5001')
const orbitdb = new OrbitDB(ipfs)

const db = orbitdb.eventlog("feed name")

db.add("hello world")
  .then(() => {
    const latest = db.iterator({ limit: 5 }).collect()
    console.log(latest.join("\n"))
  })
```

## API

See [API documentation](https://github.com/haadcode/orbit-db/blob/master/API.md) for the full documentation.

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

Check the code in [examples/browser/index.js](https://github.com/haadcode/orbit-db/blob/master/examples/browser/index.js).

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

Issues, comments, feedback, feature requests and PRs highly welcome!

## License

MIT ©️ 2016 Haadcode
