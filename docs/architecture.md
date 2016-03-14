***WIP***

### Structure
The database has one log (OrbitList) for each *channel*. *Channel* is comparable to a *"topic"* or *"table"*.

```
DB
|-- channel 1
|   |-- list 1
|   |   |-- node 1
|   |       |-- operation
|   |           |-- value
|   |-- list 2
|-- channel 2
    |-- list 3
...
```

### Operation Logs
- Each *channel* is saved as a log of operations: add, put, del
- Operations are stored in an append-only log linked list
- Each node in the linked list points to the previous node
- Event log: take latest add or del operation for <hash>
- JV-store: take last put or del operation for <key>

### CRDTs
- orbit-db is a CmRDT and implements an LWW-element-set
- Operation-based CRDT
- Uses Merkle Trees for partial ordering

### add/put IO:
==> Not expensive

1. Create POST for the content
`ipfs object get QmZzic86oN7B5GMMYnTFvZMyDMjkKEBXe5SYsryXPeoGdb?`
```json
{
  "content": "hello 1",
  "ts": 1457703735759,
  "meta": {
    "type": "text",
    "size": 7,
    "ts": 1457703735759
  }
}
```

2. Create POST for the DB operation
`ipfs object get QmZzBNrUiYATJ4aicPTbupnEUWH3AHDmfBbDTQK3fhhYDE`
```json
{
  "op": "ADD",
  "key": "QmZzic86oN7B5GMMYnTFvZMyDMjkKEBXe5SYsryXPeoGdb",
  "value": "QmZzic86oN7B5GMMYnTFvZMyDMjkKEBXe5SYsryXPeoGdb",
  "meta": {
    "type": "orbit-db-op",
    "size": 15,
    "ts": 1457703735779
  },
  "by": "userA"
}
```

3. Create ipfs object for the nodet
`ipfs object get QmX2Jq1JHmgjgM3YVuHyGSRpUWMDbv4PuRhqBhsZqDmagD`
```json
{
  "id": "userA",
  "seq": 0,
  "ver": 1,
  "data": "QmZzBNrUiYATJ4aicPTbupnEUWH3AHDmfBbDTQK3fhhYDE",
  "next": {
    "userA.0.0": "QmXUTgYPG4cSaHW8dKggJRfLvPWjaDktWyRAgn5NPwTqtz"
  }
}
```

4. Create ipfs object for the current list
`ipfs object get Qmb2rpex9TdmoXvwLKLL24atWa2HfPbArobN7XiBAFvmZ9`
```json
{
  "id": "userA",
  "seq": 1,
  "ver": 0,
  "items": {
    "userA.0.0": "QmXUTgYPG4cSaHW8dKggJRfLvPWjaDktWyRAgn5NPwTqtz",
    "userA.0.1": "QmX2Jq1JHmgjgM3YVuHyGSRpUWMDbv4PuRhqBhsZqDmagD"
  }
}
```

5. Pubsub.publish (send to socket, network IO)
```json
{ 
  channel: '<channel name>', 
  hash: 'Qmb2rpex9TdmoXvwLKLL24atWa2HfPbArobN7XiBAFvmZ9'
}
```

### get IO:
==> A little expensive

1. Payload (get from ipfs-hash, network IO)

### sync/merge IO:
==> Expensive!
TODO
