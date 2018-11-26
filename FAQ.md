# Frequently Asked Questions

OrbitDB, like all code, is in a state of constant development. Doubtless, you're going to have some questions. The purpose of this FAQ is to answer the most common questions regarding how to get OrbitDB up and running, how to address common issues, and how to deal with pitfalls and common errors implementing it.

This is a living document. If you see an answer that could be improved, please [open an issue](https://github.com/orbitdb/orbit-db/issues/new) or submit a PR directly. If you think than a question is missing, please [open an issue](https://github.com/orbitdb/orbit-db/issues/new). If you think that there is a better way to resolve a question - perhaps by improving the  `orbitdb --help` docs or by adding a feature - please [open an issue](https://github.com/orbitdb/orbit-db/issues/new). Sense a theme yet? :)

This document is seeded by questions from people opening issues in this repository. If enough people ask the same question, we'll add one here and point newcomers to it. Please don't be offended if the maintainers say "read the FAQ" - it's our way of making sure we don't spend all of our time answering the same questions.

**Questions**

<!-- toc -->

- [Database replication is not working. Why?](#database-replication-is-not-working-why)
- [Can I recreate the entire database on another machine based on the address?](#can-i-recreate-the-entire-database-on-another-machine-based-on-the-address)
- [Is every `put` to OrbitDB immediately sent to the network and persisted?](#is-every-put-to-orbitdb-immediately-sent-to-the-network-and-persisted)
- [Does OrbitDB already support pinning when using js-ipfs ?](#does-orbitdb-already-support-pinning-when-using-js-ipfs-)
- [Does orbit have a shared feed between peers where multiple peers can append to the same feed?](#does-orbit-have-a-shared-feed-between-peers-where-multiple-peers-can-append-to-the-same-feed)
- [Contribute](#contribute)

<!-- tocstop -->

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

Currently [js-ipfs](https://github.com/ipfs/js-ipfs) doesn't have GC, so nothing gets removed meaning everything is pinned by default.

However, this will change in the future as js-ipfs gets GC and we want to make sure that OrbitDB is actually persisting everything (by default), so some work on pinning needs to happen. If you're using OrbitDB with go-ipfs (through js-ipfs-api), then GC happens and data may not be persisted anymore after a time. This is a known issue and we're planning to implement actual pinning (from IPFS perspective) soon.

### Does orbit have a shared feed between peers where multiple peers can append to the same feed?

> "...or, is it done more like scuttlebutt, where each peer has their own feed"

All databases (feeds) are shared between peers, so nobody "owns them" like users do in ssb (afaik). Multiple peers can append to the same db. @tyleryasaka is right in that each peer has their own copy of the db (the log) and they may have different versions between them but, as @tyleryasaka (correctly) describes, through the syncing/replication process the peers exchange "their knowledge of the db" (heads) with each other, the dbs/logs get merged. This is what the "CRDT" in ipfs-log enables. But from address/authority/ownership perspective, they all share the same feed.

### How can I contribute to this FAQ?

See the introduction at the top! Please open any issues and pull requests you can to improve this FAQ.md. It is here for you. If you're confused, ask another question publicly; it's possible that other people are, too. If you don't want to open an issue, feel free to jump onto [the Gitter](https://gitter.im/orbitdb/Lobby) and ask us there, too.