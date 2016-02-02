# orbit-client

## Introduction

Key-Value Store and Event Store on IPFS.

Requires `orbit-server` to connect to. Get from https://github.com/haadcode/orbit-server.

## Features
- Distributed kv-store and event log database
- Stores all data in IPFS
- Data encrypted on the wire and at rest
- Per channel access rights

_Channel maps to "table", "keyspace", "topic" or "feed" in similar systems_

## API
    connect(host, username, password)

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

        .remove({ key: <key>, hash: <event's ipfs-hash> }) // Remove entry (use one option)

        .setMode(modes) // Set channel modes, can be an object or an array of objects

            // { mode: "+r", params: { password: password } }   // Set read mode
            // { mode: "-r" }                                   // Remove read-mode
            // { mode: "+w", params: { ops: [orbit.user.id] } } // Set write-mode, only users in ops can write
            // { mode: "-w" }                                   // Remove write-mode

        .info() // Returns channel's current head and modes

        .delete() // Deletes the channel, all data will be "removed" (unassociated with the channel, actual data is not deleted)

## Usage
```javascript
var async       = require('asyncawait/async');
var OrbitClient = require('./OrbitClient');

var host = 'localhost:3006'; // orbit-server address

async(() => {
    // Connect
    const orbit = OrbitClient.connect(host, username, password);

    const channelName = 'hello-world';

    // Send an event
    const head = orbit.channel(channelName).add('hello'); // <ipfs-hash>

    // Delete an event
    orbit.channel(channelName).remove(head);

    // Iterator options
    const options  = { limit: -1 }; // fetch all messages

    // Get events
    const iter  = orbit.channel(channelName).iterator(options); // Symbol.iterator
    const next  = iter.next(); // { value: <item>, done: false|true}

    // OR:
    // var all = iter.collect(); // returns all elements as an array

    // OR:
    // for(let i of iter)
    //   console.log(i.hash, i.item);

    // KV-store
    orbit.channel(channelName).put("key1", "hello world");
    orbit.channel(channelName).get("key1"); // returns "hello world"

    // Modes
    const password = 'hello';
    let channelModes;
    channelModes = orbit.channel(channel).setMode({ mode: "+r", params: { password: password } }); // { modes: { r: { password: 'hello' } } }
    channelModes = orbit.channel(channel, password).setMode({ mode: "+w", params: { ops: [orbit.user.id] } }); // { modes: { ... } }
    channelModes = orbit.channel(channel, password).setMode({ mode: "-r" }); // { modes: { ... } }
    channelModes = orbit.channel(channel, '').setMode({ mode: "-w" }); // { modes: {} }

    // Delete channel
    const result = orbit.channel(channelName, channelPwd).delete(); // true | false
})();
```

### Development
#### Run Tests
*Note! Before running tests, make sure orbit-server is running*

```
npm test
```

Keep tests running while development:
```
mocha -w
```

### TODO
- Tests for remove(), put() and get()
- pubsub communication (use redis to mock ipfs pubsub)
- Local caching of messages
- Possibility to fetch content separately from data structure
- Use HTTPS instead of HTTP (channel password are sent in plaintext atm)
