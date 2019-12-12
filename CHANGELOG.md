# Changelog

Note: OrbitDB follows [semver](https://semver.org/). We are currently in alpha: backwards-incompatible changes may occur in minor releases.

## v0.23.0

### Performance Improvements
  Performance improvements have been made to both writing and loading.

  Our benchmarks show an increase of 2-3x loading and writing speeds! :tada:

```
  v0.22.0
  Starting IPFS...
  DB entries: 1000
  Writing DB...
  writing took 3586 ms
  Loading DB...
  load took 1777 ms

  v0.23.0
  Starting IPFS...
  DB entries: 1000
  Writing DB...
  writing took 1434 ms
  Loading DB...
  load took 802 ms

  // Writing improved: ~2.5x
  // Loading improved: ~2.2x
```
The speed-up between the versions is more pronounced as the size of the database increases:
```
  v0.22.0
  Starting IPFS...
  DB entries: 10000
  Writing DB...
  writing took 31292 ms
  Loading DB...
  load took 26812 ms

  v0.23.0
  Starting IPFS...
  DB entries: 10000
  Writing DB...
  writing took 10383 ms
  Loading DB...
  load took 5542 ms

  // Writing improved: ~3x
  // Loading improved: ~4.8x
  ```

To try out the benchmarks for yourself run `node benchmarks/benchmark-load.js`

### Entry references
Each entry added now contains references to previous entries in powers of 2 distance apart up to a maximum distance of `referenceCount` (default 32) from it, speeding up both writing and loading and resulting in smaller entry sizes. [#275](https://github.com/orbitdb/ipfs-log/pull/275)

### Signature Caching
The default keystore and identity-provider now have caches added to speed up verification of entry signtures and identities. See [#53](https://github.com/orbitdb/orbit-db-identity-provider/pull/53) and [#38](https://github.com/orbitdb/orbit-db-keystore/pull/38)

### Offline mode
An optional `offline` flag has bee added which, when set to `true`, prevents pubsub from starting and messages from being exchanged. This is useful to speed up testing and for when you would like to use your database locally without networking enabled.
To use offline mode, start your IPFS nodes offline (with `new IPFS({ start: false })`) and create your OrbitDB instance as follows:

```js
const orbitdb = await OrbitDB.createInstance(ipfs, { offline: true, id: 'mylocalid' })
```

Note that an `id` will need to be passed if your IPFS node is offline. If you would like to start replicating databases after starting OrbitDB in offline mode, the OrbitDB instance needs to be re-created. See [#726](https://github.com/orbitdb/orbit-db/pull/726)

### Pinning and Garbage Collection

OrbitDB does **not** automatically pin content added to IPFS. This means that if garbage collection is triggered, any unpinned content will be erased. An optional `pin` flag has been added which, when set to `true`, will pin the content to IPFS and can be set as follows:

```js
await db.put('name', 'hello', { pin: true })
```
Note that this is currently _experimental_ and will degrade performance. For more info see [this issue](https://github.com/ipfs/js-ipfs/issues/2650).

It is recommended that you collect the hashes of the entries and pin them outside of the `db.put/add` calls before triggering garbage collection.

## v0.22.1

 - Thanks to [#712](https://github.com/orbitdb/orbit-db/pull/712) from @kolessios, as well as the efforts of @BartKnucle and @durac :heart:, OrbitDB now works on Windows :tada: We invite our Windows friends to try it out!
 - Several submodules are now exposed in the OrbitDB class ([#717](https://github.com/orbitdb/orbit-db/pull/717), thanks @hazae41)

## v0.22.0

 Up to 10x Performance Increase in Appends :tada:

 - `sortFn` now at the top level
 - `orbit-db-storage-adapter` now provides cache and keystore interop for mongo, redis, and any `abstract-leveldown`

### (semi-)Breaking Changes

To improve performance, this release changes the way caches are managed.

#### Cache Directory Locations

_Your cache directory structure will change_. There is a migration script that will run upon creating the database.

Old Structure (node.js default):
```
orbitdb/[OrbitDB ID]/keystore
orbitdb/[DB ID]/db-name/
orbitdb/[DB ID]/db-name1/
orbitdb/[DB ID]/db-name2/
```

New Structure (node.js default):
```
orbitdb/[OrbitDB ID]/keystore
orbitdb/[OrbitDB ID]/cache
```
##### `identityKeysPath` is optional, but important!

Read more about what this release includes [here](https://orbitdb.org/orbitdb-release-v0.22).

## v0.20.0
***This release contains API breaking changes!*** The release **IS** backwards compatible with respect to old OrbitDB addresses and will be able to process and read old data-structures. The shape of the `Entry` object has also changed to include an [`identity`](https://github.com/orbitdb/orbit-db-identity-provider) field as well as increment the version `v` to 1. The `hash` property now holds a [CIDv1](https://github.com/multiformats/cid#cidv1) multihash string.

API breaking changes:

- ### Constructor:
The OrbitDB constructor requires an instance of `identity` to be passed as an argument:
```javascript
const orbitdb = new OrbitDB(ipfs, identity, [options])
```
- ### Creating an OrbitDB instance:
  The preferred method for creating an instance of OrbitDB is the async `createInstance` method which will create an `identity` for you if one is not passed in the options.
```javascript
const orbitdb = await OrbitDB.createInstance(ipfs, [options])
```
- ### OrbitDB key
  The `key` property has been removed and replaced with `identity`. You can access the public-key with:
  ```javascript
  orbitdb.identity.publicKey
  ```

Read further and see the [API documentation](https://github.com/orbitdb/orbit-db/blob/master/API.md), [examples](https://github.com/orbitdb/orbit-db/tree/master/examples) and [Getting Started Guide](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md) to learn more about the changes. Note that we don't use semver for the npm module, so be sure to lock your orbit-db dependency to the previous release if you don't want to upgrade.

### Improved Write Permissions

OrbitDB now supports dynamically granting write-access to keys after database-creation. Previous releases required the database address to change if the write-access keys were changed. We've added an [AccessController module](https://github.com/orbitdb/orbit-db-access-controllers) which allows custom-logic access-controllers to be added to OrbitDB. Two examples of how to create and add new access-controllers can be found in the repo. An [ethereum-based access-controller](https://github.com/orbitdb/orbit-db-access-controllers/blob/master/src/contract-access-controller.js) which uses a smart-contract to determine access-rights and an [OrbitDB Access Controller](https://github.com/orbitdb/orbit-db-access-controllers/blob/master/src/orbitdb-access-controller.js) which uses another OrbitDB store to maintain access-rights. For more information, see: [Access Control](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md#access-control).

### Identity Support

We've added orbit-db-identity-provider which allows users to link external identities, such as an Ethereum account, with their OrbitDB identity. For more information, see [orbit-db-identity-provider](https://github.com/orbitdb/orbit-db-identity-provider).

### Keystore fix
A bug in orbit-db-keystore in which messages larger than 32-bytes signed by the same key produced the same signature has been fixed.

### js-ipfs v0.34.x support

OrbitDB now uses the ipfs-dag API and thus supports the latest js-ipfs again. :tada:

### go-ipfs support

With this release, we finally bring back the support for using OrbitDB with go-ipfs (through js-ipfs-http-client). You can now use OrbitDB again with a running IPFS daemon and without starting an in-process js-ipfs node.

To make OrbitDB work again with go-ipfs, we refactored some parts of the messaging and created two new modules to do that: ipfs-pubsub-peer-monitor and ipfs-pubsub-1on1. They're both modules on top of IPFS Pubsub and are used to handle the automatic message exchange upon peers connecting.

As this is the first release with support for go-ipfs in a long time, please report any problems you may experience!

### Improved test suite and documentation

We've improved the documents by adding details, fixing errors and clarifying them.

We also improved the tests a lot since the previous release. We now run the tests with js-ipfs-http-client (go-ipfs) in addition to running them with js-ipfs (Node.js). We've also cleaned up and refactored the boilerplate code for tests, improved the speed of the test run and generally polished the test suite for better readability and maintainability.

### Custom stores

OrbitDB can now use a custom store through addDatabaseType(), see more [here](https://github.com/orbitdb/orbit-db/blob/master/API.md#orbitdbadddatabasetypetype-store) and [here](https://github.com/orbitdb/orbit-db-store#creating-custom-data-stores).

### Important fixes

The previous release brought in LevelDB as the storage backend for Node.js and browser and there were some rough edges. We've fixed a bunch a problems related to using LevelDB and it should all work now.

Last, we further improved the replication code and its performance at places.

## v0.19.0

This release bring a bunch of fixes and updates improving performance, stability and browser compatibility. As always, we highly encourage to update to the latest version and report any problems in https://github.com/orbitdb/orbit-db/issues.

A big thank you to all the contributors who helped and contributed to this release! <3

### Replication

The previous release included a refactored version of the replication code and we've improved it even further in this release in terms of performance as well as stability. We're now seeing *huge* improvement in replication speed, especially when replicating a database from scratch.

To observe these improvements, run the [browser examples](https://github.com/orbitdb/orbit-db/tree/master/examples/browser) with two (different) browser tabs and replicate a database with > 100 or so entries from tab to another.

### Browser compatibility

We had some problems with browsers due to the way we used native modules. This is now fixed and OrbitDB should work in the browsers just the same as in Node.js.

### LevelDB

We've switched from using filesystem-based local cache to using LevelDB as the local storage. [Leveldown](https://www.npmjs.com/package/leveldown/) is used when run in Node.js and [level-js](https://www.npmjs.com/package/level-js) is used for browsers.

### General Updates

We put some work into the [CRDTs library](https://github.com/orbitdb/crdts) we're using and have updated OrbitDB to use the latest version. We've added more tests and improved the test suite code and tests now run faster than they did previously.

### Performance

With all the updates and fixes, we're now seeing much better performance for replicating databases between peers as well as for write throughput. See [benchmarks](https://github.com/orbitdb/orbit-db/tree/master/benchmarks) if you're interested to try it out yourself.

## v0.18.0

This release is a major one as we've added new features, fixed many of the old problems, improved the performance and code base and overhauled the documentation. OrbitDB is now more robust, easier to use, faster and comes with much awaited write-permissions feature.

***This release contains API breaking changes with no backward compatibility!*** Read further and see the [API documentation](https://github.com/orbitdb/orbit-db/blob/master/API.md), [examples](https://github.com/orbitdb/orbit-db/tree/master/examples) and [Getting Started Guide](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md) to learn more about the changes. Note that we don't use semver for the npm module, so be sure to lock your orbit-db dependency to the previous release if you don't want to upgrade.

### Write-permissions

OrbitDB now has write-permissioned databases! \o/ This gives us verifiable, distributed databases and data structures enabling tons of new use cases and possibilities. User-owned data collections, feeds and lists, State and Payment Channels, and many more!

Permissions are defined by public keys and databases in OrbitDB support one or multiple write keys per database. Each database update is signed with a write-access key and the signature is verified by the clients against access control information. Next step is to extend the access control functionality to include read permissions. Read more about [Access Control](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md#access-control) and [Keys](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md#keys).

### Addresses

OrbitDB databases, their name and ID, are now addressed through a naming scheme:

```
/orbitdb/Qmd8TmZrWASypEp4Er9tgWP4kCNQnW4ncSnvjvyHQ3EVSU/my/database/hello
```

Read more about [Addresses](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md#address).

### Replication

The previous versions of OrbitDB had a flaky replication implementation which has been completely re-written for this release. We've made performance improvements and more importantly, peers now start syncing the database automatically and reliably.

### Performance

Several performance improvements made throughout OrbitDB's code base together with latest [IPFS](https://github.com/ipfs/js-ipfs) we're seeing much better throughput numbers in benchmarks. There are still many improvements to be made!

### Documentation and Examples

We've written a brand new [Getting Started Guide](https://github.com/orbitdb/orbit-db/blob/master/GUIDE.md) to work as a tutorial and a place to understand OrbitDB's features and usage. The [API documentation](https://github.com/orbitdb/orbit-db/blob/master/API.md) was also updated to reflect latest features and changes.

All [examples](https://github.com/orbitdb/orbit-db/tree/master/examples) were updated along with an [updated UI](https://raw.githubusercontent.com/orbitdb/orbit-db/feat/write-access/screenshots/example1.png) for the [browser demo](https://ipfs.io/ipfs/QmRosp97r8GGUEdj5Wvivrn5nBkuyajhRXFUcWCp5Zubbo/). [Another small browser demo](https://ipfs.io/ipfs/QmasHFRj6unJ3nSmtPn97tWDaQWEZw3W9Eh3gUgZktuZDZ/) was added and there's a [TodoMVC with Orbitdb example](https://github.com/orbitdb/orbit-db/issues/246) in the works.

### Code Base Improvements

Due to legacy reasons, OrbitDB previously used a wrapper module for IPFS called `ipfs-daemon`. We have removed and deprecated `ipfs-daemon` and are now using [js-ipfs](https://github.com/ipfs/js-ipfs) directly!

We've switched to using *async/await* in the code base throughout the modules. This means the minimum required version of Node.js is now 8.0.0. To use with older versions of Node.js, we provide an [ES5-compatible build](https://github.com/orbitdb/orbit-db/tree/master/dist/es5). We've also added support for logging, which can be turned on with `LOG=[debug|warn|error]` environment variable.

## v0.12.0
- IPFS pubsub
