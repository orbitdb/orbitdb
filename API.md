## orbit-db API documentation

**WORK IN PROGRESS**

#### Table of Contents

- [Getting Started](#getting-started)
- [orbitdb](#orbitdb)
  - [kvstore(name)](#kvstorename)
    - [put(key, value)](#kvstorename)
    - [set(key, value)](#kvstorename)
    - [get(key)](#kvstorename)
    - [events](#kvstorename)
  - [eventlog(name)](#eventlogname)
    - [add(event)](#eventlogname)
    - [get(hash)](#eventlogname)
    - [iterator([options])](#eventlogname)
    - [events](#eventlogname)
  - [feed(name)](#feedname)
    - [add(data)](#feedname)
    - [get(hash)](#feedname)
    - [iterator([options])](#feedname)
    - [remove(hash)](#feedname)
    - [events](#feedname)
  - [counter(name)](#countername)
    - [value](#countername)
    - [inc([amount])](#countername)
    - [events](#countername)
  - [disconnect()](#disconnect)
  - [events](#events)
    - [orbitdb](#events)
    - [stores](#events)

#### Getting Started

Install `orbit-db` and [ipfs](https://www.npmjs.com/package/ipfs) from npm:

```
npm install orbit-db ipfs
```

Require it in your program:

```javascript
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

const ipfs = new IPFS()
const orbitdb = new OrbitDB(ipfs)
```

This will tell `orbit-db` to use the [Javascript implementation](https://github.com/ipfs/js-ipfs) of IPFS. Choose this options if you're using `orbitd-db` to develop **Browser** applications.

Alternatively, you can use [ipfs-api](https://npmjs.org/package/ipfs-api) to use `orbit-db` with a locally running IPFS daemon:

```
npm install orbit-db ipfs-api
```

```javascript
const IpfsApi = require('ipfs-api')
const OrbitDB = require('orbit-db')

const ipfs = IpfsApi('localhost', '5001')
const orbitdb = new OrbitDB(ipfs)
```

Choose this options if you're using `orbitd-db` to develop **Desktop** (or "headless") applications, eg. with [Electron](https://electron.atom.io).

#### orbitdb

After creating an instance of `orbitd-db`, you can now access the different data stores.

##### kvstore(name)

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

  - **events**

    ```javascript
    db.events.on('data', (dbname, event) => ... )
    ```

    See [events](#stores) for full description.

##### eventlog(name)

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
    
  - **iterator([options])**
    ```javascript
    // TODO: add all options - gt, gte, lt, lte, limit, reverse
    const all = db.iterator({ limit: -1 })
      .collect()
      .map((e) => e.payload.value)
    // [{ name: 'User1' }]
    ```
    
  - **events**

    ```javascript
    db.events.on('data', (dbname, event) => ... )
    ```

    See [events](#stores) for full description.

##### feed(name)

  ```javascript
  const db = orbitdb.feed('orbit-db.issues')
  ```

  - **add(data)**
    ```javascript
    db.add({ name: 'User1' }).then((hash) => ...)
    ```
    
  - **get(hash)**
    ```javascript
    const event = db.get(hash)
      .map((e) => e.payload.value)
    // { name: 'User1' }
    ```
    
  - **iterator([options])**
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
    
  - **events**

    ```javascript
    db.events.on('data', (dbname, event) => ... )
    ```

    See [events](#stores) for full description.

##### counter(name)
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

    ```javascript
    db.events.on('data', (dbname, event) => ... )
    ```

    See [events](#stores) for full description.

##### disconnect()
  ```javascript
  orbitdb.disconnect()
  ```

##### events

  - **orbitdb**

    - `data` - (dbname, event)

      Emitted when an update happens in any of the open databases.

      ```javascript
      orbitdb.events.on('data', (dbname, event) => ...)
      ```

  - **stores**

    Each database in `orbit-db` contains an `events` ([EventEmitter](https://nodejs.org/api/events.html)) object that emits events that describe what's happening in the database.

    - `data` - (dbname, event)
      
      Emitted after an entry was added to the database

      ```javascript
      db.events.on('data', (dbname, event) => ... )
      ```

    - `sync` - (dbname)

      Emitted before starting a database sync with a peer.

      ```javascript
      db.events.on('sync', (dbname) => ... )
      ```

    - `load` - (dbname, hash)

      Emitted before loading the database history. *hash* is the hash from which the history is loaded from.

      ```javascript
      db.events.on('load', (dbname, hash) => ... )
      ```

    - `history` - (dbname, entries)

      Emitted after loading the database history. *entries* is an Array of entries that were loaded.

      ```javascript
      db.events.on('history', (dbname, entries) => ... )
      ```

    - `ready` - (dbname)

      Emitted after fully loading the database history.

      ```javascript
      db.events.on('ready', (dbname) => ... )
      ```

    - `write` - (dbname, hash)

      Emitted after an entry was added locally to the database. *hash* is the IPFS hash of the latest state of the database.

      ```javascript
      db.events.on('write', (dbname, hash) => ... )
      ```
