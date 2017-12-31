# Changelog

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
