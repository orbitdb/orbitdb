## OrbitDB API - v1.0

OrbitDB is a serverless, distributed, peer-to-peer database. OrbitDB uses IPFS
as its data storage and Libp2p Pubsub to automatically sync databases with peers. It's an eventually consistent database that uses Merkle-CRDTs for conflict-free database writes and merges making OrbitDB an excellent choice for p2p and decentralized apps, blockchain applications and local first web applications.

To install OrbitDB:

```bash
npm install @orbitdb/core
```

IPFS is also required:

```bash
npm install ipfs-core
```

Instantiate OrbitDB and create a database:

```js
import { create } from 'ipfs-core'
import { createOrbitDB } from '@orbitdb/core'

const ipfs = await create() // IPFS is required for storage and network communication
const orbitdb = await createOrbitDB({ ipfs })
const mydb = await orbitdb.open('mydb')
console.log(mydb.address) // /orbitdb/zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13
await mydb.add("hello world!")
```

Open and replicate an existing database:

```js
// In another process
import { create } from 'ipfs-core'
import { createOrbitDB } from '@orbitdb/core'

const ipfs = await create()
const orbitdb = await createOrbitDB({ ipfs })
const theirdb = await orbitdb.open('/orbitdb/zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13')
for await (let record of theirdb.iterator()) {
  console.log(record)
}
```

See the [OrbitDB module](./module-OrbitDB.html) for more information about how to open databases.
