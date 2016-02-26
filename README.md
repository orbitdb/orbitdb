# OrbitDB

## Introduction

Distributed, peer-to-peer Key-Value Store and Event Log on IPFS.

- Stores all data in IPFS, including the database index
- Replication happens on client side and data is eventually consistent
- Uses a LWW-element-set [CRDT](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type) and (sort of) Vector Clocks for partial ordering
- Designed to work offline first and to be easily embeddable to applications

_Currently requires [orbit-server](https://github.com/haadcode/orbit-server) for pubsub communication. This will change in the future as soon as IPFS provides pubsub._

_OrbitDB calls its namespaces channels. A channel is similar to "table", "keyspace", "topic", "feed" or "collection" in other db systems._

## Examples
Before running the examples, install dependencies with:
```
npm install
```

Key-Value store example:
```
node examples/keyvalue.js <channel> <username> <key> <value>
node examples/keyvalueReader.js <channel> <username> <key>
```

Event log example (run several in separate shells):
```
node examples/reader.js <channel> <username> <data> <interval in ms>
```

## API
_See usage example below_

    connect(host, port, username, password)

    channel(name, password)

        .add(data: String) // Insert an event to a channel, returns <ipfs-hash> of the event

        .iterator([options]) // Returns an iterator of events

            // options : { 
            //   gt: <ipfs-hash>,   // Return events newer than <ipfs-hash>
            //   gte: <ipfs-hash>,  // Return events newer then <ipfs-hash> (inclusive)
            //   lt: <ipfs-hash>,   // Return events older than <ipfs-hash>
            //   lte: <ipfs-hash>,  // Return events older than <ipfs-hash> (inclusive)
            //   limit: -1,         // Number of events to return, -1 returns all, default 1
            //   reverse: true      // Return items oldest first, default latest first
            // }

        .put(key, data: String) // Insert (key,value) to a channel

        .get(key) // Retrieve value

        .del({ key: <key or hash> }) // Remove entry

        .delete() // Deletes the channel, all data will be "removed" (unassociated with the channel, actual data is not deleted from ipfs)

## Usage
```javascript
const async       = require('asyncawait/async');
const OrbitClient = require('./OrbitClient');

// orbit-server
const host = 'localhost';
const port = 3333;

async(() => {
    // Connect
    const orbit = OrbitClient.connect(host, port, username, password);

    const channelName = 'hello-world';
    const db = orbit.channel(channelName);

    /* Event Log */
    const hash = db.add('hello'); // <ipfs-hash>

    // Remove event
    db.remove(hash);

    // Iterator options
    const options = { limit: -1 }; // fetch all messages

    // Get events
    const iter = db.iterator(options); // Symbol.iterator
    const next = iter.next(); // { value: <item>, done: false|true}

    // OR:
    // var all = iter.collect(); // returns all elements as an array

    // OR:
    // for(let i of iter)
    //   console.log(i.hash, i.item);

    /* KV Store */
    db.put('key1', 'hello world');
    db.get('key1'); // returns "hello world"
    db.del('key1');

    /* Delete channel */
    const result = db.delete(); // true | false
})();
```

### Development
#### Run Tests
```
npm test
```

Keep tests running while development:
```
mocha -w
```

### TODO
- Fix encryption
- Caching
