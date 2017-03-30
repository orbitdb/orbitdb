# orbit-db API documentation

OrbitDB provides various types of databases for different data models: 
- [kvstore](#kvstorename) is a key-value database just like your favourite key-value database.
- [eventlog](#eventlogname) is an append-only log with traversable history. Useful for *"latest N"* use cases or as a message queue.
- [feed](#feedname) is a log with traversable history. Entries can be added and removed. Useful for *"shopping cart" type of use cases, or for example as a feed of blog posts or "tweets".
- [counter](#countername) for counting. Useful for example counting events separate from log/feed data.
- [docstore](##docstorename-options) is a document database to which documents can be stored and indexed by a specified key. Useful for example building search indices or version controlling documents and data.

Which database to use depends on your use case and data model.

## Getting Started

Install `orbit-db` and [ipfs](https://www.npmjs.com/package/ipfs) from npm:

```
npm install orbit-db ipfs
```

Require it in your program and create the instance:

```javascript
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

const ipfs = new IPFS()
const orbitdb = new OrbitDB(ipfs)
```

`orbitdb` is now the [OrbitDB](#orbitdb) instance we can use to interact with the databases.

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

`orbitdb` is now the [OrbitDB](#orbitdb) instance we can use to interact with the databases.

Choose this options if you're using `orbitd-db` to develop **Desktop** (or "headless") applications, eg. with [Electron](https://electron.atom.io).


## Usage

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
  - [docstore(name, options)](#docstorename-options)
    - [put(doc)]()
    - [get(hash)]()
    - [query(mapper)]()
    - [del(key)]()
    - [events]()
  - [counter(name)](#countername)
    - [value](#countername)
    - [inc([amount])](#countername)
    - [events](#countername)
  - [disconnect()](#disconnect)
  - [events](#events)
    - [orbitdb](#events)
    - [stores](#events)

## orbitdb

After creating an instance of `orbitd-db`, you can now access the different data stores.

### kvstore(name)

  Package: 
  [orbit-db-kvstore](https://github.com/haadcode/orbit-db-kvstore)

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

  - **load()**

    Load the locally persisted database state to memory.

    ```javascript
    db.events.on('ready', () => {
      /* query */
    })
    db.load()
    ```

  - **events**

    ```javascript
    db.events.on('ready', () => /* local database loaded in memory */ )
    db.events.on('synced', () => /* query for updated results */ )
    ```

    See [events](#events) for full description.

### eventlog(name)

  Package: 
  [orbit-db-eventstore](https://github.com/haadcode/orbit-db-eventstore)

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
    
  - **load()**

    Load the locally persisted database state to memory.

    ```javascript
    db.events.on('ready', () => {
      /* query */
    })
    db.load()
    ```

  - **events**

    ```javascript
    db.events.on('ready', () => /* local database loaded in memory */ )
    db.events.on('synced', () => /* query for updated results */ )
    ```

    See [events](#events) for full description.

### feed(name)

  Package: 
  [orbit-db-feedstore](https://github.com/haadcode/orbit-db-feedstore)

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
    
  - **load()**

    Load the locally persisted database state to memory.

    ```javascript
    db.events.on('ready', () => {
      /* query */
    })
    db.load()
    ```

  - **events**

    ```javascript
    db.events.on('ready', () => /* local database loaded in memory */ )
    db.events.on('synced', () => /* query for updated results */ )
    ```

    See [events](#events) for full description.

### docstore(name, options)

  Package: 
  [orbit-db-docstore](https://github.com/shamb0t/orbit-db-docstore)

  ```javascript
  const db = orbitdb.docstore('orbit.users.shamb0t.profile')
  ```

  By default, documents are indexed by field '_id'. You can also specify the field to index by:

  ```javascript
  const db = orbitdb.docstore('orbit.users.shamb0t.profile', { indexBy: 'name' })
  ```

  - **put(doc)**
    ```javascript
    db.put({ _id: 'QmAwesomeIpfsHash', name: 'shamb0t', followers: 500 }).then((hash) => ...)
    ```
    
  - **get(key)**
    ```javascript
    const profile = db.get('shamb0t')
      .map((e) => e.payload.value)
    // [{ _id: 'shamb0t', name: 'shamb0t', followers: 500 }]
    ```
    
  - **query(mapper)**
    ```javascript
    const all = db.query((doc) => doc.followers >= 500)
    // [{ _id: 'shamb0t', name: 'shamb0t', followers: 500 }]
    ```

  - **del(key)**
    ```javascript
    db.del('shamb0t').then((removed) => ...)
    ```
    
  - **load()**

    Load the locally persisted database state to memory.

    ```javascript
    db.events.on('ready', () => {
      /* query */
    })
    db.load()
    ```

  - **events**

    ```javascript
    db.events.on('ready', () => /* local database loaded in memory */ )
    db.events.on('synced', () => /* query for updated results */ )
    ```

    See [events](#events) for full description.

### counter(name)

  Package: 
  [orbit-db-counterstore](https://github.com/haadcode/orbit-db-counterstore)

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
    
  - **load()**

    Load the locally persisted database state to memory.

    ```javascript
    db.events.on('ready', () => {
      /* query */
    })
    db.load()
    ```

  - **events**

    ```javascript
    db.events.on('ready', () => /* local database loaded in memory */ )
    db.events.on('synced', () => /* query for updated results */ )
    ```

    See [events](#events) for full description.

### disconnect()

  ```javascript
  orbitdb.disconnect()
  ```

### events

  - **stores**

    Each database in `orbit-db` contains an `events` ([EventEmitter](https://nodejs.org/api/events.html)) object that emits events that describe what's happening in the database.

    - `synced` - (dbname)

      Emitted when an update happens in the databases. Eg. when the database was synchronized with a peer. This is usually a good place to requery the database
      for updated results, eg. if a value of a key was changed or if there are new
      events in an event log.

      ```javascript
      db.events.on('synced', () => ... )
      ```

    - `sync` - (dbname)

      Emitted before starting a database sync with a peer.

      ```javascript
      db.events.on('sync', (dbname) => ... )
      ```

    - `load` - (dbname)

      Emitted before loading the local database.

      ```javascript
      db.events.on('load', (dbname) => ... )
      ```

    - `ready` - (dbname)

      Emitted after fully loading the local database.

      ```javascript
      db.events.on('ready', (dbname) => ... )
      ```

    - `write` - (dbname, hash, entry)

      Emitted after an entry was added locally to the database. *hash* is the IPFS hash of the latest state of the database. *entry* is the added database op.

      ```javascript
      db.events.on('write', (dbname, hash, entry) => ... )
      ```

    - `load.progress` - (dbname, hash, entry, progress)

      Emitted while loading the local database, once for each entry. *dbname* is the name of the database that emitted the event. *hash* is the multihash of the entry that was just loaded. *entry* is the database operation entry. *progress* is a sequential number starting from 0 upon calling `load()`.

      ```javascript
      db.events.on('load.porgress', (dbname, hash, entry, progress) => ... )
      ```

    - `error` - (error)

      Emitted on an error.

      ```javascript
      db.events.on('error', (err) => ... )
      ```
