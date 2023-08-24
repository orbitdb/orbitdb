# Operations Log

Every database in OrbitDB is formed by an operations log or oplog. The oplog is an immutable, append-only log of updates to the database. Each update is an entry in the log and the state of a database is derived from its oplog entries.

The oplog is formally a [Merkle-CRDT](https://arxiv.org/abs/2004.00107). It is a Merkle-DAG where each node, or entry, contains a reference to previous nodes in their causal order forming a Directed Acyclic Graph (DAG).

Structuring the oplog as a DAG, the order of operations can be established for sequential and concurrent updates to the database. The DAG itself establishes a strong causal order and by using a deterministic conflict resolution algorithm for concurrent update, a total order is formed for the updates to the database. From this totally ordered list of operations, the database state is computed.

The oplog being a Merkle-DAG, the integrity and immutability of the entries and their order can be cryptographically verified. That is, once an entry is added to the oplog, its position in the DAG or its data can't be changed and removed making the oplog tamper-proof.

## Oplog entry

Each entry in the oplog describes an update to a database. An entry contains the payload of an update, which is used to compute database state, along with information to verify its integrity and validity. An entry, upon adding it to an oplog, is cryptographically signed by the writer which is then verified by the receivers of the update.

Entries are IPLD data structures, stored in IPFS and each entry is retrievable by their hash.

An oplog entry with the hash `zdpuB1VGJULBZq8YEnmEKDhKrJF5goKZxJcBcg3HzJgDdxMkZ` looks like this:

```js
{
  v: 2,
  id: '/orbitdb/zdpuArkmnVAAVjEZfF644i1iBpXHZMq3xXUofgF7UZF4ukPJT',
  key: '029a8405cfd6800bea85c31b9438ba7f96592f5c4756ad176b811d591961697a89',
  sig: '3045022100b07fee7696c740021b82cfa95de3262efa593bc115ace2a0d82694469ada60f70220198335d8fea0c37f16d61faf426d440c8f0cae55a3c5b098a10a1ce62835dbd3',
  next: [ 'zdpuAsjEHJKydfWjpjmhzYTPJkjSfbRWZ455GJRsN3RZgj9Nm' ],
  refs: [ 'zdpuApQnDfNfGFF3UtTpCLTFMZZvCKYpJQL4EZrvwEBv7aphx' ],
  clock: {
    id: '029a8405cfd6800bea85c31b9438ba7f96592f5c4756ad176b811d591961697a89',
    time: 3
  },
  payload: { op: 'ADD', key: null, value: 'hello world!' },
  identity: 'zdpuAkY8EXyQRwtF6xzNpfM8q5jyTW2RR3Yz6CvRz1Uvdk1hJ'
}
```

The `payload` can be any data and the structure of it depends on the database type used.

## Entry retrieval

Entries can be retrieved by iterating over the oplog.

```js
for await (const entry of log.iterator()) {
  console.log(entry)
}
```

A subset of entries can also be retrieved by passing filters to the iterator. Available options include:

**amount:** only return a certain number of entries. By default the amount is -1, so all entries are returned.

**gt:** return all entries after entry with specified hash (exclusive)

**gte:** return all entries after entry with specified hash (inclusive),

**lt:**  return all entries before entry with specified hash (exclusive),

**lte:** return all entries before entry with specified hash (inclusive).

For example, the last 5 entries can be retrieved by passing the amount parameter:

```
log.iterator({ amount: 5 })
```

If the log contains less than 5 entries, all entries will be returned.

Additionally, multiple parameters can be used. To retrieve 2 entries prior to a an entry with hash 'zdpuAsjEHJKydfWjpjmhzYTPJkjSfbRWZ455GJRsN3RZgj9Nm', use amount and lt:

```
log.iterator({ amount: 2, lt: 'zdpuAsjEHJKydfWjpjmhzYTPJkjSfbRWZ455GJRsN3RZgj9Nm' })
```

## Ordering the log entries

In a peer-to-peer database, multiple versions of a database may be stored and available across many nodes which may not always be connected all of the time. Because of the adhoc nature of peer-to-peer networks, the oplog in OrbitDB optimizes for eventual consistency. That is, a database can be updated and queried even if not connected to other peers in the network, making it partition tolerant.

Upon re-connecting with peers, the local versions of the peers' databases are merged together. While the Merkle-DAG structure establishes a strong causal order, meaning that there can be updates to the database that "happened at the same time" or concurrently, a conflict resolution algorithm is used to create a total order. That is, the conflict resolution algorithm sorts the concurrent entries in a sequential manner.

## Conflict resolution

For concurrent updates, an oplog relies on a deterministic sort function to determine the order in which concurrent entries are ordered and returned. By default, an oplog uses a Last Write Wins sort function, which uses a logical clock (Lamport Clock) to determine whether one entry is "newer" than another.

Sorting can be customized by passing a custom sort function:

```javaScript
const CustomSortFn = (a, b) => {
  // alternative sorting mechanism
  return a > b ? 1 : -1
}

const log = await Log(..., { sortFn: CustomSortFn })
```

### Logical Clock

A logical clock provides a method to timestamp entries without the need to know the current state of clocks of other peers in the system.

A logical clock contains two properties: a unique hash to distinguish the writer from other writers and a logical "time" value. As each new entry is added to the oplog, the time value is monotonically incremented. These properties allow concurrent entries to be sorted deterministically. If two entries have different time values, they can be sorted based on the time and if the time value is the same for both, the entries can be sorted by the hash of the writer.

### Last Write Wins

Imagine there are two writers, A and B which both add entries to an oplog, while disconnected from each other.

Writer A has a logical clock initialized with the hash "A". Writer B has a logical clock initialized with the hash "B". Both clocks are initialized with time equal to "0".

Entries are added by A:

```
A.append('A1') // Time: 1
A.append('A2') // Time: 2
A.append('A3') // Time: 3
```

At the same time, entries are added by B:

```
B.append('B1') // Time: 1
B.append('B2') // Time: 2
```

Writer A and writer B join their oplogs.

Iterating over the entries in the oplog will yield A1, B1, A2, B2, A3.

The oplog as a DAG is:
```
     A1<-A2<-A3
___ /
    \
     B1<-B2
```

The order of entries in the log can't be determined from the causal order of the entries between A and B, the order is determined by conflict resolution algorithm (the sort function), which, by default, is Last Write Wins (LWW). The LWW algorithm will determine that an entry with a greater time will come after the entry with a lesser time. Therefore, B2 follows B1 and A3 follows both A2 and A1. And, the clock's hash will determine the order for entries with the same logical time. Therefore B1 follows A1 and B2 follows A2.

Joining entries from writer B with entries from writer A yields the same results because the sort function is the same for both logs. This ensures the ordering of the log entries is deterministic, and, thus, the same across databases.
