import { create } from 'ipfs-core'
import OrbitDB from '../src/orbitdb.js'

const creatures = ['🐙', '🐷', '🐬', '🐞', '🐈', '🙉', '🐸', '🐓']

console.log("Starting...")

async function main () {
  let db

  try {
    const ipfs = await create({
      repo: './orbitdb/examples/ipfs',
      start: true,
      EXPERIMENTAL: {
        pubsub: true,
      },
    })
    const orbitdb = await OrbitDB({ ipfs, directory: './orbitdb/examples' })
    db = await orbitdb.open('example')
  } catch (e) {
    console.error(e)
    process.exit(1)
  }

  const query = async () => {
    const index = Math.floor(Math.random() * creatures.length)
    const userId = Math.floor(Math.random() * 900 + 100)

    try {
      await db.add({ avatar: creatures[index], userId: userId })
      let latest = await db.all()
      let output = ``
      output += `[Latest Visitors]\n`
      output += `--------------------\n`
      output += `ID  | Visitor\n`
      output += `--------------------\n`
      output += latest.reverse().map((e) => e.value.userId + ' | ' + e.value.avatar).join('\n') + `\n`
      console.log(output)
    } catch (e) {
      console.error(e)
      process.exit(1)
    }
  }

  setInterval(query, 1000)
}
main()
