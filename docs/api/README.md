OrbitDB is a serverless, distributed, peer-to-peer database. OrbitDB uses IPFS
as its data storage and Libp2p Pubsub to automatically sync databases with peers. It's an eventually consistent database that uses Merkle-CRDTs for conflict-free database writes and merges making OrbitDB an excellent choice for p2p and decentralized apps, blockchain applications and local first web applications.

To install OrbitDB:

```bash
npm install orbit-db
```

IPFS is also required:

```bash
npm install ipfs-core
```

Instantiate OrbitDB and open a new database:

```js
import { create } from 'ipfs-core'
import { OrbitDB } from 'orbit-db'

const ipfs = await create() // IPFS is required for storage and syncing
const orbitdb = await OrbitDB({ ipfs })
const mydb = await orbitdb.open('mydb')
const dbAddress = mydb.address // E.g. /orbitdb/zdpuAuK3BHpS7NvMBivynypqciYCuy2UW77XYBPUYRnLjnw13
@example <caption>Open an existing database using its multiformat address:</caption>
const mydb = await orbitdb.open(dbAddress)
```

Use with pre-configured identities:

```js
import { create } from 'ipfs-core'
import { OrbitDB, Identities } from 'orbit-db'
import CustomStorage from './custom-storage.js'

const storage = await CustomStorage()
const identities = await Identities({ storage })
const ipfs = await create() // IPFS is required for storage and syncing
const orbitdb = await OrbitDB({ ipfs, identities })
const mydb = await orbitdb.open('mydb')
```

Use with existing identities:

```js
import { create } from 'ipfs-core'
import { OrbitDB, Identities } from 'orbit-db'

const identities = await Identities()
await identities.createIdentity('userA')

const ipfs = await create() // IPFS is required for storage and syncing
const orbitdb = await OrbitDB({ ipfs, identities, id: 'userA' })
const mydb = await orbitdb.open('mydb')
```

See the [OrbitDB module](./module-OrbitDB.html) for more information about how to open databases.