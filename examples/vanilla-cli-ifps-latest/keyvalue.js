'use strict'

const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

const userId = 1
const creatures = ['🐙', '🐬', '🐋', '🐠', '🐡', '🦀', '🐢', '🐟', '🐳']

const initIPFSInstance = async () => {
  return await IPFS.create({ repo: './keyvalue-ipfs-repo' });
};


const output = (user) => {
  if (!user)
    return

  let output = ``
  output += `----------------------\n`
  output += `User\n`
  output += `----------------------\n`
  output += `Id: ${userId}\n`
  output += `Avatar: ${user.avatar}\n`
  output += `Updated: ${user.updated}\n`
  output += `----------------------\n`
  console.log(output)
}

console.log("Starting...")


initIPFSInstance().then(async (ipfs) => {
  let db
  try {
    const orbitdb = await OrbitDB.createInstance(ipfs);

    db = await orbitdb.kvstore('example', { overwrite: true })
    await db.load()
  } catch (e) {
    console.error(e);
    process.exit(1);
  }


  const query = async () => {
    // Randomly select an avatar
    const index = Math.floor(Math.random() * creatures.length)

    // Set the key to the newly selected avatar and update the timestamp
    await db.put(userId, { avatar: creatures[index], updated: new Date().getTime() })

    // Get the value of the key
    const user = db.get(userId)

    // Display the value
    output(user)
  }

  console.log("Starting update loop...")
  setInterval(query, 1000)
})
