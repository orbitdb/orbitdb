# Frequently Asked Questions

OrbitDB, like all code, is in a state of constant development. Doubtless, you're going to have some questions. The purpose of this FAQ is to answer the most common questions regarding how to get OrbitDB up and running, how to address common issues, and how to deal with pitfalls and common errors implementing it.

This is a living document. If you see an answer that could be improved, please [open an issue](https://github.com/orbitdb/orbit-db/issues/new) or submit a PR directly. If you think than a question is missing, please [open an issue](https://github.com/orbitdb/orbit-db/issues/new). If you think that there is a better way to resolve a question - perhaps by improving the  `orbitdb --help` docs or by adding a feature - please [open an issue](https://github.com/orbitdb/orbit-db/issues/new). Sense a theme yet? :)

This document is seeded by questions from people opening issues in this repository. If enough people ask the same question, we'll add one here and point newcomers to it. Please don't be offended if the maintainers say "read the FAQ" - it's our way of making sure we don't spend all of our time answering the same questions.

## Can I recreate the entire database on another machine based on the address?

A database can't be "recreated" without downloading the database from other peers. Knowing an address will allow a user to open the database, which automatically connects to other peers who have the database open, and downloads the database which then "recreates" the database state locally, ie. replicates the database.
