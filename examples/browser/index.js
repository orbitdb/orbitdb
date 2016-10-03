'use strict'

const IpfsApi = require('exports?IpfsApi!ipfs-api/dist/index.js')
const OrbitDB = require('../../src/OrbitDB')

const username = 'user1'
const channel  = 'browsertest1'
const key      = 'greeting'

try {
  const elm = document.getElementById("result")
  const ipfs = IpfsApi('localhost', '5001')
  const orbit = new OrbitDB(ipfs, username)

  const db = orbit.kvstore(channel)
  const log = orbit.eventlog(channel + ".log")
  const counter = orbit.counter(channel + ".count")

  const creatures = ['👻', '🤖', '🐬', '🐞', '🐈']

  let count = 1
  const query = () => {
    const startTime = new Date().getTime()
    const idx = Math.floor(Math.random() * creatures.length)

    // Set a key-value pair
    db.put(key, "db.put #" + count + " - GrEEtinGs to " + creatures[idx])
      .then((res) => {
        const endTime = new Date().getTime()
        console.log(`db.put (#${count}) took ${(endTime - startTime)} ms\n`)
        count ++
      })
      .then(() => counter.inc()) // Increase the counter by one
      .then(() => log.add(creatures[idx])) // Add an event to 'latest visitors' log
      .then(() => {
          const result = db.get(key)
          const latest = log.iterator({ limit: 5 }).collect()
          const count  = counter.value()

          const output = 
`
---------------------------------------------------
Key       | Value
---------------------------------------------------
${key} | ${result}
---------------------------------------------------

---------------------------------------------------
Latest Visitors
---------------------------------------------------
${latest.reverse().map((e) => e.payload.value).join('\n')}

---------------------------------------------------
Visitor Count: ${count}
---------------------------------------------------
`
          elm.innerHTML = output.split("\n").join("<br>")
          console.log(output)          
      })
      .catch((e) => {
        elm.innerHTML = "<i>" + e.message + "</i><br><br>" + "Make sure you have an IPFS daemon running at localhost:5001"
        console.error(e.stack)
      })
  }
  setInterval(query, 1000)

} catch(e) {
  console.error(e.stack)
  elm.innerHTML = e.message
}
