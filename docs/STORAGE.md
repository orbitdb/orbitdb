# Storage

OrbitDB is all about storage, and storage can be configured to best meet the needs of the implementation. Storage is also designed to be hierarchical, allowing for a variety of storage mechanisms to be used together.

Which storage strategy is chosen depends on the requirements of the application. OrbitDB's storage customization allows for trade-offs between memory usage and speed.

## Storage types

OrbitDB is bundled with the following storage:

- IPFSBlockStorage: IPFS block level storage,
- LevelStorage: LevelDB-based storage,
- LRUStorage: A Least Recently Used cache,
- MemoryStorage: A memory only array,
- ComposedStorage: Combines two storages, eg. LRUStorage and IPFSBlockStorage.

All storage objects expose two common functions, `put` for adding a record and `get` for retrieving a record. This allows for storage to be easily swapped in and out based on the needs of the database solution.

### Composed storage

ComposedStorage combines two of the above storage objects. This reduces the need for performance and capability trade-offs because a combination of storage mechanisms can be used for a balance of speed vs memory usage. For example, MemoryStorage plus LevelStorage can be used for fast retrieval plus semi-permanent data storage, or LRU for efficient caching of frequently accessed items plus IPFSBlockStorage for replication.

To use composed storage, create two storage objects and then pass them to an instance of `ComposedStorage`:

```js
const memoryStorage = await MemoryStorage()
const levelStorage = await LevelStorage()

const composedStorage = await ComposedStorage(memoryStorage, levelStorage)
```

The order in which primary storage is passed to ComposedStorage is important. When accessed, ComposedStorage will attempt to retrieve the data from the first storage mechanism, so this should be the performance-based storage. If not found, ComposedStorage will attempt to retrieve the data from the second storage; this will likely be some kind of permanent storage mechanism. 

## Customizing Storage

To override OrbitDB's default storage, alternative storages can be specified when a database is opened:

```js
const entryStorage = await MemoryStorage()
const headsStorage = await MemoryStorage()
const db = await orbitdb.open('my-db', { entryStorage, headsStorage })
```

## Implementing a third party storage solution

Any storage mechanism can be used with OrbitDB provided it implements the OrbitDB storage interface. Once created, simply pass the storage instance to OrbitDB:

```js
// Perhaps some kind of locally developed storage implementation.
import CustomStorage from './custom-storage.js'

const entryStorage = await CustomStorage()
const headsStorage = await CustomStorage()
const indexStorage = await CustomStorage()
const db = await orbitdb.open('my-db', { entryStorage, headsStorage, indexStorage })
```

See the [various storage implementations](../src/storage) to see how custom storage should be structured for compatibility with OrbitDB.