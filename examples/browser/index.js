'use strict'

const IPFS = require('ipfs-daemon/src/ipfs-browser-daemon')
const OrbitDB = require('../../src/OrbitDB')

const username = new Date().getTime()
const channel  = 'orbitdb-browser-examples'
const key      = 'greeting'

const elm = document.getElementById("result")

const ipfs = new IPFS({
  // dev server: webrtc-star-signalling.cloud.ipfs.team
  SignalServer: '188.166.203.82:20000',
})

function handleError(e) {
  console.error(e.stack)
  elm.innerHTML = e.message  
}

ipfs.on('error', (e) => handleError(e))

ipfs.on('ready', () => {
  const orbit = new OrbitDB(ipfs, username, { maxHistory: 5 })

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

          const output = `
          <b>Key-Value Store</b>
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
      .catch((e) => handleError(e))
  }

  // Start query loop when the databse has loaded its history
  db.events.on('ready', () => setInterval(query, 1000))
})
