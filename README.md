# OrbitDB

> Distributed, peer-to-peer database on IPFS.

[![CircleCI Status](https://circleci.com/gh/haadcode/orbit.svg?style=shield&circle-token=158cdbe02f9dc4ca4cf84d8f54a8b17b4ed881a1)](https://circleci.com/gh/haadcode/orbit-db)
[![Project Status](https://badge.waffle.io/haadcode/orbit.svg?label=In%20Progress&title=In%20Progress)](https://waffle.io/haadcode/orbit?source=haadcode%2Forbit-db,haadcode%2Forbit-db-counterstore,haadcode%2Forbit-db-eventstore,haadcode%2Forbit-db-feedstore,haadcode%2Forbit-db-kvstore,haadcode%2Forbit-db-store,haadcode%2Fipfs-log)

## Introduction

`orbit-db` is a distributed, peer-to-peer database for applications. You can use `orbit-db` for different data models: **Key-Value Store**, **Eventlog** (append-only log), **Feed** (add and remove log) and **Counters**. The database gets replicated automatically with peers who are connected to the same database.

This is the Javascript implementation and it works both in **Node.js** and **Browsers**.

- Client-side database to be embedded in Javascript applications
- Stores all data in IPFS
- Aggregation happens on client side and data is eventually consistent
- Designed to work offline first

**Node.js**

<img src="https://raw.githubusercontent.com/haadcode/orbit-db/feat/ipfs-pubsub/screenshots/orbit-db-demo3.gif" width="60%">

**Browser**

<img src="https://raw.githubusercontent.com/haadcode/orbit-db/feat/ipfs-pubsub/screenshots/orbit-db-demo1.gif" height="60%">

### Data stores

Currently available data stores:

- [orbit-db-kvstore](https://github.com/haadcode/orbit-db-kvstore)
- [orbit-db-eventstore](https://github.com/haadcode/orbit-db-eventstore)
- [orbit-db-feedstore](https://github.com/haadcode/orbit-db-feedstore)
- [orbit-db-counterstore](https://github.com/haadcode/orbit-db-counterstore)

## Install

From npm:
```
npm install orbit-db
```

From git:
```
git clone https://github.com/haadcode/orbit-db.git
cd orbit-db
npm install
```

## Usage

```javascript
'use strict'

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

## Examples

### Browser example

```bash
npm install
npm run build:examples
npm run examples:browser
```

### Node.js example

```bash
npm install
npm run examples:node
```

See detailed [example](https://github.com/haadcode/orbit-db/blob/master/examples/eventlog.js) and run it with:
```bash
node examples/eventlog.js
```

```javascript
'use strict'

const IpfsDaemon = require('ipfs-daemon')
const OrbitDB = require('orbit-db')

IpfsDaemon()
  .then((res) => {
    const orbitdb = new OrbitDB(res.ipfs)
    const db = orbitdb.eventlog("|orbit-db|examples|eventlog-example")

    const creatures = ['🐙', '🐷', '🐬', '🐞', '🐈', '🙉', '🐸', '🐓']

    const query = () => {
      const index = Math.floor(Math.random() * creatures.length)
      db.add(creatures[index])
        .then(() => {
          const latest = db.iterator({ limit: 5 }).collect()
          let output = ``
          output += `---------------------------------------------------\n`
          output += `Latest Visitors\n`
          output += `---------------------------------------------------\n`
          output += latest.reverse().map((e) => e.payload.value).join('\n') + `\n`
          console.log(output)          
        })
        .catch((e) => {
          console.error(e.stack)
        })
    }

    setInterval(query, 1000)
  })
  .catch((err) => console.error(err))
```

## API

**TODO**

- [orbit-db-kvstore](https://github.com/haadcode/orbit-db-kvstore)
  - put(key, value)
  - set(key, value)
  - get(key)
- [orbit-db-eventstore](https://github.com/haadcode/orbit-db-eventstore)
  - add(value)
  - get(hash)
  - iterator(options)
- [orbit-db-feedstore](https://github.com/haadcode/orbit-db-feedstore)
  - add(value)
  - del(hash)
  - get(hash)
  - iterator(options)
- [orbit-db-counterstore](https://github.com/haadcode/orbit-db-counterstore)
  - inc([value])

## Development

#### Run Tests
```bash
npm test
```

#### Build distributables
```bash
npm run build
```

## Background

**TODO**

Check out a visualization of the data flow at https://github.com/haadcode/proto2

Live demo: http://celebdil.benet.ai:8080/ipfs/Qmezm7g8mBpWyuPk6D84CNcfLKJwU6mpXuEN5GJZNkX3XK/

![Screenshot](https://raw.githubusercontent.com/haadcode/proto2/master/screenshot.png)

**TODO: list of modules used, orbit-db-pubsub, etc.**

## Contributing

**TODO**

## License

MIT ©️ 2016, Haadcode
