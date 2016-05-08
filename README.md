# OrbitDB

## Introduction

Distributed, peer-to-peer database on IPFS.

This is the Javascript implementation and it works both in **Node.js** and **Browsers**.

- Client-side database to be embedded in Javascript applications
- Stores all data in IPFS
- Aggregation happens on client side and data is eventually consistent
- Designed to work offline first

**NOTE: the README can be out of date, I'm working to get up to date. If you find a problem, please open an issue or a PR.**

_Currently requires [orbit-server](https://github.com/haadcode/orbit-server) for pubsub communication. This will change in the future as soon as IPFS provides pubsub._

![Screenshot](https://raw.githubusercontent.com/haadcode/orbit-db/master/screenshot.png)

## Install
```
npm install orbit-db
```

## Examples
### Node.js examples
*To run the examples, make sure to run a local [orbit-server](https://github.com/haadcode/orbit-server)*

Before running the examples, install dependencies with:
```
npm install
```

Key-Value store [example](https://github.com/haadcode/orbit-db/blob/master/examples/keyvalue.js):
```
node examples/keyvalue.js <host> <username> <channel> <key> <value>
```

Event log [example](https://github.com/haadcode/orbit-db/blob/master/examples/eventlog.js) (run several in separate shells):
```
node examples/eventlog.js <host> <username> <channel> <data> <interval in ms>
```

Benchmark writes:
```
node examples/benchmark.js <host> <username> <channel>;
```


### Browser examples
In order to run the browser example, you need to have a local IPFS daemon running. Start it with the following command:
```
API_ORIGIN=* ipfs daemon
```

Then open `examples/browser.html`. See the full example [here](https://github.com/haadcode/orbit-db/blob/master/examples/browser.html).

```html
<html>
  <head>
    <meta charset="utf-8">
  </head>
  <body>
    <script type="text/javascript" src="orbitdb.min.js" charset="utf-8"></script>
    <script type="text/javascript" src="ipfsapi.min.js" charset="utf-8"></script>
    <script type="text/javascript">
      const ipfs = IpfsApi();
      OrbitDB.connect('QmRB8x6aErtKTFHDNRiViixSKYwW1DbfcvJHaZy1hnRzLM', 'user1', '', ipfs).then((orbit) => {
        orbit.kvstore('test').then((db) => {
          db.put('hello', 'world').then((res) => {
            const result = db.get(key);
            console.log(result);
          });
        });
      });
    </script>
  </body>
</html>
```

## API
**NOTE: the API documentation is currently out of date. It will be updated soon!**

_See usage example below_

_OrbitDB calls its namespaces channels. A channel is similar to "table", "keyspace", "topic", "feed" or "collection" in other db systems._

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
const async   = require('asyncawait/async');
const ipfsAPI = require('ipfs-api');
const OrbitDB = require('orbit-db');

// local ipfs daemon
const ipfs = ipfsAPI();

async(() => {
    // Connect
    const orbit = await(OrbitClient.connect('QmRB8x6aErtKTFHDNRiViixSKYwW1DbfcvJHaZy1hnRzLM', 'usernamne', '', ipfs));

    /* Event Log */
    const eventlog = orbit.eventlog('eventlog test');
    const hash = await(eventlog.add('hello')); // <ipfs-hash>

    // Remove event
    await(eventlog.remove(hash));

    // Iterator options
    const options = { limit: -1 }; // fetch all messages

    // Get events
    const iter = eventlog.iterator(options); // Symbol.iterator
    const next = iter.next(); // { value: <item>, done: false|true}

    // OR:
    // var all = iter.collect(); // returns all elements as an array

    // OR:
    // for(let i of iter)
    //   console.log(i.hash, i.item);

    /* Delete database locally */
    eventlog.delete();

    /* KV Store */
    const kvstore = orbit.kvstore('kv test');
    await(kvstore.put('key1', 'hello world'));
    kvstore.get('key1'); // returns "hello world"
    await(kvstore.del('key1'));
})();
```

### Development
#### Source Code
The entry point for the code is [src/Client.js](https://github.com/haadcode/orbit-db/blob/master/src/Client.js) and the DB implementation is [src/OrbitDB.js](https://github.com/haadcode/orbit-db/blob/master/src/OrbitDB.js)

#### Run Tests
```
npm test
```

Keep tests running while development:
```
mocha -w
```

#### Lint
*Work in progress! Throws an error "Parsing error: The keyword 'await' is reserved".*
```
npm run lint
```

### TODO
- make ipfs-log emit events ('data', 'load')
  - Store: this._log.events.on('data', (log, entries) => this._index.updateIndex(log, entries))
- merge 'readable' and 'data' events (only one)

## Notes
### Data structure description
*For future [IPLD](https://github.com/ipfs/ipld-examples) references*

List snapshots are posted to pubsub:
```
> QmRzWAiFdLkdkwBDehzxhHdhfwbDKDnzqBnX53va58PuQu
> ...
```

**Get a list snapshot**

`ipfs object get QmRzWAiFdLkdkwBDehzxhHdhfwbDKDnzqBnX53va58PuQu`
```json
{
  "Links": [],
  "Data": {
    "id": "user123",
    "items": [
      "QmNwREbsgGgiQPXxpvGanD55inFjUXjpEqjiPtpa39P7Mn",
      "QmQxndNEzWxKT5KRqRsty7JDGcbPVazaYPCqfB5z1mxmon",
      "QmUN1X97M2t8MX55H8VoPGXu2fLBpr91iCAzHkXudSMvDE"
    ]
  }
}
```

**Get the item**

`ipfs object get QmNwREbsgGgiQPXxpvGanD55inFjUXjpEqjiPtpa39P7Mn`
```json
{
  "Links": [],
  "Data": {
    "id": "user123",
    "data": "QmasZEUwc67yftPvdSxRLWenmvF8faLnS7TMphQpn4PCWZ",
    "next": [
      "QmS17ABxzFEVoHv5WEvATetNEZhN2vkNApRPcFQUaJfij3"
    ]
  }
}
```

**Get the item's data (operation)**

`ipfs object get QmasZEUwc67yftPvdSxRLWenmvF8faLnS7TMphQpn4PCWZ`
```json
{
  "Links": [],
  "Data": {
    "op": "PUT",
    "key": "default",
    "value": "QmaAPEKDdaucQZRseJmKmWwZhgftBSwj8TD1xEomgcxo1X",
    "meta":{
      "type": "text",
      "size": -1,
      "from": "user123",
      "ts": 1456494484094
    }
  }
}
```

**Get the value**

`ipfs object get QmaAPEKDdaucQZRseJmKmWwZhgftBSwj8TD1xEomgcxo1X`
```json
{
  "Links": [],
  "Data": {
    "content": "LambOfGod 347",
    "ts": 1456494484089
  }
}
```
