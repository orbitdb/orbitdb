'use strict'

const IpfsApi = require('@haad/ipfs-api')
const OrbitDB = require('../../src/OrbitDB')

const username = new Date().getTime()
const channel  = 'browser-example'
const key      = 'greeting'

try {
  const elm = document.getElementById("result")
  const ipfs = new IpfsApi('localhost', '5001')
  const orbit = new OrbitDB(ipfs, username)

  const db = orbit.kvstore(channel)
  const log = orbit.eventlog(channel + ".log")
  const counter = orbit.counter(channel + ".count")

  const creatures = ['👻', '🐙', '🐷', '🐬', '🐞', '🐈', '🙉', '🐸', '🐓']

  let count = 1
  const query = () => {
    const idx = Math.floor(Math.random() * creatures.length)

    // Set a key-value pair
    db.put(key, "db.put #" + count + " - GrEEtinGs to " + creatures[idx])
      .then((res) => count ++)
      .then(() => counter.inc()) // Increase the counter by one
      .then(() => log.add(creatures[idx])) // Add an event to 'latest visitors' log
      .then(() => {
          const result = db.get(key)
          const latest = log.iterator({ limit: 5 }).collect()
          const count  = counter.value

          const output = 
`<b>Key-Value Store</b>
-------------------------------------------------------
Key | Value
-------------------------------------------------------
${key} | ${result}
-------------------------------------------------------

<b>Eventlog</b>
-------------------------------------------------------
Latest Visitors
-------------------------------------------------------
${latest.reverse().map((e) => e.payload.value + "   at " + new Date(e.payload.meta.ts).toISOString()).join('\n')}

<b>Counter</b>
-------------------------------------------------------
Visitor Count: ${count}
-------------------------------------------------------
`
          elm.innerHTML = output.split("\n").join("<br>")
      })
      .catch((e) => {
        elm.innerHTML = "<i>" + e.message + "</i><br><br>" + "Waiting for IPFS daemon to start..."
        console.error(e.stack)
      })
  }

  // Start query loop when the databse has loaded its history
  db.events.on('ready', () => setInterval(query, 1000))

} catch(e) {
  console.error(e.stack)
  elm.innerHTML = e.message
}
