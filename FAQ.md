# Frequently Asked Questions

OrbitDB, like all code, is in a state of constant development. Doubtless, you're going to have some questions. The purpose of this FAQ is to answer the most common questions regarding how to get OrbitDB up and running, how to address common issues, and how to deal with pitfalls and common errors implementing it.

This is a living document. If you see an answer that could be improved, please [open an issue](https://github.com/orbitdb/orbit-db/issues/new) or submit a PR directly. If you think than a question is missing, please [open an issue](https://github.com/orbitdb/orbit-db/issues/new). If you think that there is a better way to resolve a question - perhaps by improving the  `orbitdb --help` docs or by adding a feature - please [open an issue](https://github.com/orbitdb/orbit-db/issues/new). Sense a theme yet? :)

This document is seeded by questions from people opening issues in this repository. If enough people ask the same question, we'll add one here and point newcomers to it. Please don't be offended if the maintainers say "read the FAQ" - it's our way of making sure we don't spend all of our time answering the same questions.

**Questions**

<!-- TOC -->

- [Frequently Asked Questions](#frequently-asked-questions)
  - [Database replication is not working. Why?](#database-replication-is-not-working-why)
  - [Can I recreate the entire database on another machine based on the address?](#can-i-recreate-the-entire-database-on-another-machine-based-on-the-address)
  - [Is every `put` to OrbitDB immediately sent to the network and persisted?](#is-every-put-to-orbitdb-immediately-sent-to-the-network-and-persisted)
  - [Does OrbitDB already support pinning when using js-ipfs ?](#does-orbitdb-already-support-pinning-when-using-js-ipfs-)
  - [Does orbit have a shared feed between peers where multiple peers can append to the same feed?](#does-orbit-have-a-shared-feed-between-peers-where-multiple-peers-can-append-to-the-same-feed)
  - [I'm getting a lot of 429 (Too Many Requests) errors when I run OrbitDB](#im-getting-a-lot-of-429-too-many-requests-errors-when-i-run-orbitdb)
  - [Where can I learn more about security, encryption, and account recovery?](#where-can-i-learn-more-about-security-encryption-and-account-recovery)
  - [Does OrbitDB natively allow for a multi-writer capability permission model?](#does-orbitdb-natively-allow-for-a-multi-writer-capability-permission-model)
  - [How can I contribute to this FAQ?](#how-can-i-contribute-to-this-faq)

<!-- /TOC -->

---

### Database replication is not working. Why?

_The answer to this question is a work in progress. See [orbit-db#505](https://github.com/orbitdb/orbit-db/issues/505)._

### Can I recreate the entire database on another machine based on the address?

A database can't be "recreated" without downloading the database from other peers. Knowing an address will allow a user to open the database, which automatically connects to other peers who have the database open, and downloads the database which then "recreates" the database state locally, ie. replicates the database.

### Is every `put` to OrbitDB immediately sent to the network and persisted?

When calling `put` or any other update operation on a database, the data is 1) saved locally and persisted to IPFS and 2) send to the network, through IPFS Pubsub, to peers who have the database open (ie. peers).

Upon calling `put` (or other updates), OrbitDB saves the data locally and returns. That is, the operation and its data is saved to the local node only after which `put` returns and *asynchronously* sends a message to pubsub peers. OrbitDB doesn't have a notion of confirming replication status from other peers (although this can be added on user-level) and considers operation a success upon persisting it locally. OrbitDB doesn't use consensus nor does it wait for the network to confirm operations making it an *eventually consistent* system.

In short: it can't be assumed that data has been replicated to the network after an update-operation call finishes (eg. `put`, `add`).

### Does OrbitDB already support pinning when using js-ipfs ?

Currently [js-ipfs](https://github.com/ipfs/js-ipfs) supports `ipfs.repo.gc()` but it's yet not run on any sort of schedule, so nothing gets removed from a `js-ipfs` node and therefore an OrbitDB database.

However, this will change in the future as js-ipfs schedules GC and we want to make sure that OrbitDB is actually persisting everything (by default), so [some work on pinning needs to happen](https://github.com/ipfs/js-ipfs/issues/2650). If you're using OrbitDB with go-ipfs (through js-ipfs-api), and GC happens and data may not be persisted anymore. Once the pinning performance is fixed we will implement pinning-by-default in [`orbit-db-io`](https://github.com/orbitdb/orbit-db-io).

### Does orbit have a shared feed between peers where multiple peers can append to the same feed?

> "...or, is it done more like scuttlebutt, where each peer has their own feed"

All databases (feeds) are shared between peers, so nobody "owns them" like users do in ssb (afaik). Multiple peers can append to the same db. @tyleryasaka is right in that each peer has their own copy of the db (the log) and they may have different versions between them but, as @tyleryasaka (correctly) describes, through the syncing/replication process the peers exchange "their knowledge of the db" (heads) with each other, the dbs/logs get merged. This is what the "CRDT" in ipfs-log enables. But from address/authority/ownership perspective, they all share the same feed.

### I'm getting a lot of 429 (Too Many Requests) errors when I run OrbitDB

This happens when there's only one node with data available, and the system isn't able to effectively get all of the data it needs from it. In order to get around this, IPFS instantiates nodes with preload enabled, so that one node isn't effectively DDoSed. However, sometimes these nodes go down, as well, causing 429 errors. To get around this in example cases (certainly not in production), disable preload:

```
this.ipfs = new Ipfs({
  preload: { enabled: false },
  // ...
}
```

### Where can I learn more about security, encryption, and account recovery?

The very short answer is that OrbitDB is agnostic in terms of encryption and account recovery with the aim of providing maximum flexibility with your apps. We don't do any encryption on our side; however, nothing is stopping you from encrypting data before storing it in the OrbitDB network. OrbitDB (just like IPFS) will treat encrypted the data exactly the same. Any node can replicate the data, but only nodes which have access to the encryption key from some other means will be able to decrypt it.


### Does OrbitDB natively allow for a multi-writer capability permission model?

BY default, if you allow `*` access to the access controller, like so:

`orbitdb.feed('name', { accessController: { write ['*'] }})`

To allow specific keys to write to the database, pass the keys as strings like so:

`orbitdb.feed('name', { accessController: { write ['key1', 'key2'] }}) // keys cannot be revoked`

Allows anyone to write to the db. If you specify keys, the process involves granting and revoking keys. Granting is doable, but revocation is a harder and is being worked on by multiple parties, without a solution.

If you want to encrypt the keys or content, it's easier with a single user. If you want to use encryption with multiwriters, that's another bag which also hasn't been solved.

The concept of identity in OrbitDB currently centers on a single user associated with a public key. To do more than this, you may need a different access controller. [@3box](https://github.com/3box) has a modified access controller plugin, [3box-orbitdb-plugins](https://github.com/3box/3box-orbitdb-plugins), which is worth looking at for how to do this.

|  |  Non-Encrypted | Encrypted | 
| ----- | ----- | ---- |
| Single Writer | Default | Requires encryption key management |
| Multi Writer | Difficulty w/ granting + revocation    | Difficulty w/ granting + revocation AND sharing encryption keys     |

We'd love to add multi-writer support to OrbitDB! The maintainers at Haja are currently not working on anything related to it though but would be happy to help. Your best bet is to jump on [Gitter](https://gitter.im/orbitdb/Lobby) and ask us where the current efforts are.

### How can I contribute to this FAQ?

See the introduction at the top! Please open any issues and pull requests you can to improve this FAQ.md. It is here for you. If you're confused, ask another question publicly; it's possible that other people are, too. If you don't want to open an issue, feel free to jump onto [the Gitter](https://gitter.im/orbitdb/Lobby) and ask us there, too.
