# OrbitDB

> Distributed, peer-to-peer database on IPFS.

[![npm version](https://badge.fury.io/js/orbit-db.svg)](https://badge.fury.io/js/orbit-db)
[![CircleCI Status](https://circleci.com/gh/haadcode/orbit-db.svg?style=shield)](https://circleci.com/gh/haadcode/orbit-db)
[![Project Status](https://badge.waffle.io/haadcode/orbit.svg?label=In%20Progress&title=In%20Progress)](https://waffle.io/haadcode/orbit?source=haadcode%2Forbit-db,haadcode%2Forbit-db-counterstore,haadcode%2Forbit-db-eventstore,haadcode%2Forbit-db-feedstore,haadcode%2Forbit-db-kvstore,haadcode%2Forbit-db-store,haadcode%2Fipfs-log)

## Introduction

`orbit-db` is a serverless, distributed, peer-to-peer database. `orbit-db` uses [IPFS]() as its data storage and [IPFS Pubsub]() to automatically sync databases with peers.

Data in `orbit-db` can be stored in a

- **Key-Value Store**
- **Eventlog** (append-only log)
- **Feed** (add and remove log)
- **Counters**

This is the Javascript implementation and it works both in **Node.js** and **Browsers**.

## Usage
```
npm install orbit-db
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

## Examples

### Clone

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

<img src="https://raw.githubusercontent.com/haadcode/orbit-db/feat/ipfs-pubsub/screenshots/orbit-db-demo1.gif" height="50%">


### Node.js example

```
npm run examples:node
```

<img src="https://raw.githubusercontent.com/haadcode/orbit-db/feat/ipfs-pubsub/screenshots/orbit-db-demo3.gif" width="60%">

See details in [example](https://github.com/haadcode/orbit-db/blob/master/examples/eventlog.js) and run it with:
```
LOG=debug node examples/eventlog.js
```

## API

**WORK IN PROGRESS**

- [Getting Started](#getting-started)
- [orbitdb](#orbitdb-1)
  - [kvstore(name)]()
  - [eventlog(name)]()
  - [feed(name)]()
  - [counter(name)]()
  - [disconnect()]()
  - [events]()

#### Getting Started

```javascript
const ipfs = require('ipfs')
const OrbitDB = require('orbit-db')
const orbitdb = new OrbitDB(ipfs)
```

#### orbitdb

- **[kvstore](https://github.com/haadcode/orbit-db-kvstore)(name)**
  ```javascript
  const db = orbitdb.kvstore('application.settings')
  ```

  - **put(key, value)**
    ```javascript
    db.put('hello', { name: 'World' }).then(() => ...)
    ```

  - **set(key, value)**
    ```javascript
    db.set('hello', { name: 'Friend' }).then(() => ...)
    ```
    
  - **get(key)**
    ```javascript
    const value = db.get('hello')
    // { name: 'Friend' }
    ```
    
- **[eventlog](https://github.com/haadcode/orbit-db-eventstore)(name)**
  ```javascript
  const db = orbitdb.eventlog('site.visitors')
  ```

  - **add(event)**
    ```javascript
    db.add({ name: 'User1' }).then((hash) => ...)
    ```
    
  - **get(hash)**
    ```javascript
    const event = db.get(hash)
      .map((e) => e.payload.value)
    // { name: 'User1' }
    ```
    
  - **iterator(options)**
    ```javascript
    // TODO: add all options - gt, gte, lt, lte, limit, reverse
    const all = db.iterator({ limit: -1 })
      .collect()
      .map((e) => e.payload.value)
    // [{ name: 'User1' }]
    ```
    
- **[feed](https://github.com/haadcode/orbit-db-feedstore)(name)**
  ```javascript
  const db = orbitdb.feed('orbit-db.issues')
  ```

  - **add(value)**
    ```javascript
    db.add({ name: 'User1' }).then((hash) => ...)
    ```
    
  - **get(hash)**
    ```javascript
    const event = db.get(hash)
      .map((e) => e.payload.value)
    // { name: 'User1' }
    ```
    
  - **iterator(options)**
    ```javascript
    // TODO: add all options - gt, gte, lt, lte, limit, reverse
    const all = db.iterator({ limit: -1 })
      .collect()
      .map((e) => e.payload.value)
    // [{ name: 'User1' }]
    ```

  - **remove(hash)**
    ```javascript
    db.remove(hash).then((removed) => ...)
    ```
    
- **[counter](https://github.com/haadcode/orbit-db-counterstore)(name)**
  ```javascript
  const counter = orbitdb.counter('song_123.play_count')
  ```

  - **value**
    ```javascript
    counter.value // 0
    ```

  - **inc([value])**
    ```javascript
    counter.inc()
    counter.value // 1
    counter.inc(7)
    counter.value // 8
    counter.inc(-2)
    counter.value // 8
    ```
    
- **events**

  - `data` - (dbname, event)

    ```javascript
    orbitdb.events.on('data', (dbname, event) => ...)
    ```

- **disconnect()**
  ```javascript
  orbitdb.disconnect()
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

## Background

**TODO**

Check out a visualization of the data flow at https://github.com/haadcode/proto2

Live demo: http://celebdil.benet.ai:8080/ipfs/Qmezm7g8mBpWyuPk6D84CNcfLKJwU6mpXuEN5GJZNkX3XK/

![Screenshot](https://raw.githubusercontent.com/haadcode/proto2/master/screenshot.png)

**TODO: list of modules used, orbit-db-pubsub, etc.**

## Contributing

**TODO**

Issues and PRs welcome!

## License

MIT (c)️ 2016 Haadcode
