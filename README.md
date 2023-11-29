# OrbitDB

<p align="left">
  <img src="images/orbit_db_logo_color.png" width="256" />
</p>

[![Matrix](https://img.shields.io/matrix/orbit-db%3Amatrix.org)](https://app.element.io/#/room/#orbit-db:matrix.org) [![npm (scoped)](https://img.shields.io/npm/v/%40orbitdb/core)](https://www.npmjs.com/package/@orbitdb/core) [![node-current (scoped)](https://img.shields.io/node/v/%40orbitdb/core)](https://www.npmjs.com/package/@orbitdb/core)

OrbitDB is a **serverless, distributed, peer-to-peer database**. OrbitDB uses [IPFS](https://ipfs.tech) as its data storage and [Libp2p Pubsub](https://docs.libp2p.io/concepts/pubsub/overview/) to automatically sync databases with peers. It's an eventually consistent database that uses [Merkle-CRDTs](https://arxiv.org/abs/2004.00107) for conflict-free database writes and merges making OrbitDB an excellent choice for p2p and decentralized apps, blockchain applications and [local-first](https://www.inkandswitch.com/local-first/) web applications.

OrbitDB provides various types of databases for different data models and use cases:

- **[events](https://github.com/orbitdb/orbitdb/blob/master/API.md#orbitdblognameaddress)**: an immutable (append-only) log with traversable history. Useful for *"latest N"* use cases or as a message queue.
- **[documents](https://github.com/orbitdb/orbitdb/blob/master/API.md#orbitdbdocsnameaddress-options)**: a document database to which JSON documents can be stored and indexed by a specified key. Useful for building search indices or version controlling documents and data.
- **[keyvalue](https://github.com/orbitdb/orbitdb/blob/master/API.md#orbitdbkeyvaluenameaddress)**: a key-value database just like your favourite key-value database.
- **[keyvalue-indexed](https://github.com/orbitdb/orbitdb/blob/master/API.md#orbitdbkeyvaluenameaddress)**: key-value data indexed in a Level key-value database.

All databases are [implemented](https://github.com/orbitdb/orbitdb/tree/main/src/databases/) on top of OrbitDB's [OpLog](https://github.com/orbitdb/orbitdb/tree/main/src/oplog/), an immutable, cryptographically verifiable, operation-based conflict-free replicated data structure ([CRDT](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)) for distributed systems. OpLog is formalized in the paper [Merkle-CRDTs](https://arxiv.org/abs/2004.00107). You can also easily extend OrbitDB by [implementing and using a custom data model](https://github.com/orbitdb/orbitdb/blob/main/docs/DATABASES.md#building-a-custom-database) benefitting from the same properties as the default data models provided by the underlying Merkle-CRDTs.

This is the Javascript implementation and it works both in **Browsers** and **Node.js** with support for Linux, OS X, and Windows.

***NOTE!*** *[js-ipfs](https://github.com/ipfs/js-ipfs) and related packages are now superseded by IPFS's [Helia](https://github.com/ipfs/helia) project and are no longer being maintained. As part of this migration, OrbitDB will be soon [switching to Helia](https://github.com/ipfs/helia).*

A Go implementation is developed and maintained by the [Berty](https://github.com/berty) project at [berty/go-orbit-db](https://github.com/berty/go-orbit-db).

## Installation

```
npm install @orbitdb/core
```

### Browser <script> tag

OrbitDB can be loaded in the browser using the distributed js file with the `<script/>` tag. OrbitDB is the global namespace and all external functions are available via this namespace:

`<script>/path/to/orbitdb.min.js</script>`

## Usage

If you're using `@orbitdb/core` to develop **browser** or **Node.js** applications, use it as a module with the javascript instance of IPFS.

```javascript
import IPFS from 'ipfs-core'
import { createOrbitDB } from '@orbitdb/core'

;(async function () {
  const ipfs = await IPFS.create()
  const orbitdb = await createOrbitDB({ ipfs })

  // Create / Open a database. Defaults to db type "events".
  const db = await orbitdb.open("hello")
  
  const address = db.address
  console.log(address)
  // "/orbitdb/zdpuAkstgbTVGHQmMi5TC84auhJ8rL5qoaNEtXo2d5PHXs2To"
  // The above address can be used on another peer to open the same database

  // Listen for updates from peers
  db.events.on("update", async entry => {
    console.log(entry)
    const all = await db.all()
    console.log(all)
  })

  // Add an entry
  const hash = await db.add("world")
  console.log(hash)

  // Query
  for await (const record of db.iterator()) {
    console.log(record)
  }
  
  await db.close()
  await orbitdb.stop()
})()
```

## Documentation

Use the **[Getting Started](https://github.com/orbitdb/orbitdb/blob/main/docs/GETTING_STARTED.md)** guide for an initial introduction to OrbitDB and you can find more advanced topics covered in our [docs](https://github.com/orbitdb/orbitdb/blob/main/docs).

### API

See [https://api.orbitdb.org](https://api.orbitdb.org) for the full API documentation.

## Development

### Run Tests
```sh
npm run test
```

### Build
```sh
npm run build
```

### Benchmark
```sh
node benchmarks/benchmark-add.js
```

See [benchmarks/](https://github.com/orbitdb/orbitdb/tree/master/benchmarks) for more benchmarks.

### API

To build the API documentation, run:

```sh
npm run build:docs
```

Documentation is output to ./docs/api.

## Other implementations

- Golang: [berty/go-orbit-db](https://github.com/berty/go-orbit-db)
- Python: [orbitdb/py-orbit-db-http-client](https://github.com/orbitdb/py-orbit-db-http-client)

If you know of any other repos that ought to be included in this section, please open a PR and add them.

## Contributing

**Take a look at our organization-wide [Contributing Guide](https://github.com/orbitdb/welcome/blob/master/contributing.md).** You'll find most of your questions answered there.

If you want to code but don't know where to start, check out the issues labelled ["help wanted"](https://github.com/orbitdb/orbitdb/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22+sort%3Areactions-%2B1-desc).

## Sponsors

The development of OrbitDB has been sponsored by:

* [Protocol Labs](https://protocol.ai/)
* [Haja Networks](https://haja.io)
* [Maintainer Mountaineer](https://maintainer.io)
* [OrbitDB Open Collective](https://opencollective.com/orbitdb)

If you want to sponsor developers to work on OrbitDB, please donate to our [OrbitDB Open Collective](https://opencollective.com/orbitdb) or reach out to [@haadcode](https://github.com/haadcode).

## License

[MIT](LICENSE) © 2015-2023 Protocol Labs Inc., Haja Networks Oy, OrbitDB Community
