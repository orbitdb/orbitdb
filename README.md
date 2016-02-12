# OrbitDB

## Introduction

Distributed, peer-to-peer* Key-Value Store and Event Log on IPFS.

Requires `orbit-server` to connect to. Get from https://github.com/haadcode/orbit-server.

_* Currently requires a centralized server. This will change in the future as required p2p features land in IPFS_

## Features
- Distributed kv-store and event log database
- Stores all data in IPFS
- Data encrypted on the wire and at rest
- Per channel access rights

_Channel is similar to "table", "keyspace", "topic", "feed" or "collection" in other systems_

## API
_See Usage below_

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

        .del({ key: <key or hash> }) // Remove entry

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
    db.remove('key1');

    /* Modes */
    const password = 'hello';
    let channelModes;
    channelModes = db.setMode({ mode: '+r', params: { password: password } }); // { modes: { r: { password: 'hello' } } }
    const privateChannel = orbit.channel(channel, password);
    channelModes = privateChannel.setMode({ mode: '+w', params: { ops: [orbit.user.id] } }); // { modes: { ... } }
    channelModes = privateChannel.setMode({ mode: '-r' }); // { modes: { ... } }
    channelModes = privateChannel.setMode({ mode: '-w' }); // { modes: {} }

    /* Delete channel */
    const result = db.delete(); // true | false
})();
```

### Development
#### Run Tests
**Note!** Requires Aerospike, see http://www.aerospike.com/docs/operations/install/

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
