# orbit-client

## Introduction

***VERY MUCH WIP! WILL NOT WORK WHEN CLONED, orbit-server REQUIRED!***

Client library to interact with orbit-server. Implements the levelDOWN API without get(key, cb).

orbit-server uses linked lists on top of IPFS. 

### TODO
- local caching of messages
- channel.send()
    - check options for what type to publish as (text, snippet, file, etc.)
- channel.setMode()

## API
    connect(host, username, password)

    channel(name, password)

        .send(text)

        .iterator([options])

        .delete()

        .setMode(modes) // TODO

## Usage
```javascript
var async       = require('asyncawait/async');
var OrbitClient = require('./OrbitClient');

var host = 'localhost:3006'; // orbit-server address

async(() => {
    // Connect
    var orbit = OrbitClient.connect(host, username, password); // OrbitClient

    var channelName = 'hello-world';
    var channelPwd  = '';

    // Send a message
    var head = orbit.channel(channelName, channelPwd).send('hello'); // <ipfs-hash>

    // Iterator options
    var options  = { limit: -1 }; // fetch all messages
    // { 
    //   gt: <hash>, 
    //   gte: <hash>,
    //   lt: <hash>,
    //   lte: <hash>,
    //   limit: 10,
    //   reverse: true
    // }

    // Get messages
    var iter  = orbit.channel(channelName, channelPwd).iterator(options); // Symbol.iterator
    var next  = iter.next(); // { value: <item>, done: false|true}

    // OR:
    // for(let i of iter)
    //   console.log(i.hash, i.item.Data.seq);

    // delete channel
    var result = orbit.channel(channelName, channelPwd).delete(); // true | false
})();
```
