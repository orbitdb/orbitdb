'use strict'

const IpfsApi = require('ipfs-api')
const OrbitDB = require('../src/OrbitDB')

const ipfs = IpfsApi('localhost', '5001')
const orbitdb = new OrbitDB(ipfs)
const db = orbitdb.eventlog("/orbit-db/examples/eventlog-example")

const creatures = ['🐙', '🐷', '🐬', '🐞', '🐈', '🙉', '🐸', '🐓']

const query = () => {
  const index = Math.floor(Math.random() * creatures.length)
  db.add(creatures[index])
    .then(() => {
      const latest = db.iterator({ limit: 5 }).collect()
      let output = ``
      output += `---------------------------------------------------\n`
      output += `Latest Visitors\n`
      output += `---------------------------------------------------\n`
      output += latest.reverse().map((e) => e.payload.value).join('\n') + `\n`
      console.log(output)          
    })
    .catch((e) => {
      console.error(e.stack)
      console.log("Make sure you have an IPFS daemon running at localhost:5001")
    })
}

setInterval(query, 1000)  
