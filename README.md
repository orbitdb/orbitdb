# OrbitDB

## Introduction

Distributed, peer-to-peer* Key-Value Store and Event Log on IPFS.

_* Currently requires a redis-server server for pubsub communication. This will change in the future as soon as IPFS provides pubsub_

## Features
- Distributed kv-store and event log database
- Stores all data in IPFS

_Channel is similar to "table", "keyspace", "topic", "feed" or "collection" in other systems_

## Example
```
npm install
```

Key-Value store example:
```
node examples/keyvalue.js
```

Event log example (run in separate shells):
```
node examples/reader.js
node examples/writer.js
```

## API
_See Usage below_

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

// Redis
const host = 'localhost';
const port = 6379;

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
**Note!** Requires a redis-server at `localhost:6379`

```
npm test
```

Keep tests running while development:
```
mocha -w
```

### TODO
- Caching
