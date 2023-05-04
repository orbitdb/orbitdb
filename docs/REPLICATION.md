# Replication

Below is a simple replication example. Both peers run within the same Node daemon.

```
const waitFor = async (valueA, toBeValueB, pollInterval = 100) => {
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      if (await valueA() === await toBeValueB()) {
        clearInterval(interval)
        resolve()
      }
    }, pollInterval)
  })
}

let connected1 = false
let connected2 = false

const onConnected1 = async (peerId, heads) => {
  connected1 = true
}

const onConnected2 = async (peerId, heads) => {
  connected2 = true
}

db1.events.on('join', onConnected1)
db2.events.on('join', onConnected2)

await db1.put({ _id: 1, msg: 'record 1 on db 1' })
await db2.put({ _id: 2, msg: 'record 2 on db 2' })
await db1.put({ _id: 3, msg: 'record 3 on db 1' })
await db2.put({ _id: 4, msg: 'record 4 on db 2' })

await waitFor(() => connected1, () => true)
await waitFor(() => connected2, () => true)
```
