'use strict'

const IpfsApi   = require('ipfs-api')
const OrbitDB = require('../../src/OrbitDB')

// Usage: node index <username> <dbname>

const username = process.argv[2] || 'testrunner'
const dbname = process.argv[3] || 'testdb'
// const data = process.argv[4] || 'hello world ' + new Date().getTime()

console.log(">", username, dbname)

const ipfs = IpfsApi('localhost', '5002')
const id = username
const client = new OrbitDB(ipfs, id)
const db = client.eventlog(dbname)

setInterval(() => {
  const data = {
    value: "Hello at " + new Date().getTime(),
    from: username
  }

  db.add(data).then((hash) => {
    const result = db.iterator({ limit: 5 })
      .collect()
      .map((e) => {
        return e.payload.value
      })

    console.log("RESULT:")
    result.forEach((e) => {
      console.log(JSON.stringify(e))
    })
    console.log("")
  })
}, 1000)
