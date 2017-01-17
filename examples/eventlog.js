'use strict'

const IpfsDaemon = require('ipfs-daemon')
const OrbitDB = require('../src/OrbitDB')

const userId = Math.floor(Math.random() * 1000)

const conf = { 
  IpfsDataDir: '/tmp/' + userId,
  Addresses: {
    API: '/ip4/127.0.0.1/tcp/0',
    Swarm: ['/ip4/0.0.0.0/tcp/0'],
    Gateway: '/ip4/0.0.0.0/tcp/0'
  },
}

console.log("Starting...")

const ipfs = new IpfsDaemon(conf)

ipfs.on('error', (err) => console.error(err))

ipfs.on('ready', () => {
  const orbitdb = new OrbitDB(ipfs, userId)
  const db = orbitdb.eventlog("|orbit-db|examples|eventlog-example")

  const creatures = ['🐙', '🐷', '🐬', '🐞', '🐈', '🙉', '🐸', '🐓']

  const query = () => {
    const index = Math.floor(Math.random() * creatures.length)
    db.add({ avatar: creatures[index], userId: userId })
      .then(() => {
        const latest = db.iterator({ limit: 5 }).collect()
        let output = ``
        output += `--------------------\n`
        output += `Latest Visitors\n`
        output += `--------------------\n`
        output += latest.reverse().map((e) => e.payload.value.avatar + "  (userId: " + e.payload.value.userId + ")").join('\n') + `\n`
        console.log(output)          
      })
      .catch((e) => {
        console.error(e.stack)
      })
  }

  setInterval(query, 1000)
})
