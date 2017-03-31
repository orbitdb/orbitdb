'use strict'

const IPFS = require('ipfs')
const OrbitDB = require('../src/OrbitDB')

const creatures = ['🐙', '🐬', '🐋', '🐠', '🐡', '🦀', '🐢', '🐟', '🐳']

console.log("Starting...")

const ipfs = new IPFS({ 
  repo: './orbitdb/examples/ipfs',
  start: true,
  EXPERIMENTAL: {
    pubsub: true,
  },
})

ipfs.on('error', (err) => console.error(err))

ipfs.on('ready', async () => {
  let db

  try {
    const orbitdb = new OrbitDB(ipfs, './orbitdb/examples/eventlog')
    db = await orbitdb.kvstore('example', { overwrite: true })
  } catch (e) {
    console.error(e)
    process.exit(1)
  }

  // Create the key
  const userId = Math.floor(Math.random() * 900 + 100)

  const query = async () => {
    // Randomly select an avatar
    const index = Math.floor(Math.random() * creatures.length)

    // Set the key to the newly selected avatar and update the timestamp
    await db.put(userId, { avatar: creatures[index], updated: new Date().getTime() })

    // Get the value of the key
    const user = db.get(userId)

    // Display the value
    let output = `\n`
    output += `----------------------\n`
    output += `User\n`
    output += `----------------------\n`
    output += `Id: ${userId}\n`
    output += `Avatar: ${user.avatar}\n`
    output += `Updated: ${user.updated}\n`
    output += `----------------------`
    console.log(output)          
  }

  setInterval(query, 1000)
})
