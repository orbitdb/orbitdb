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
  const db = orbitdb.kvstore("|orbit-db|examples|kvstore-example")

  const creatures = ['🐙', '🐬', '🐋', '🐠', '🐡', '🦀', '🐢', '🐟', '🐳']

  const query = () => {
    const index = Math.floor(Math.random() * creatures.length)
    db.put(userId, { avatar: creatures[index], updated: new Date().getTime() })
      .then(() => {
        const user = db.get(userId)
        let output = `\n`
        output += `----------------------\n`
        output += `User\n`
        output += `----------------------\n`
        output += `Id: ${userId}\n`
        output += `Avatar: ${user.avatar}\n`
        output += `Updated: ${user.updated}\n`
        output += `----------------------`
        console.log(output)          
      })
      .catch((e) => {
        console.error(e.stack)
      })
  }

  setInterval(query, 1000)
})
