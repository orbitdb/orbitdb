'use strict';

const IPFS = require('exports?Ipfs!ipfs/dist/index.js')
const Logger  = require('logplease')
const logger  = Logger.create("orbit-db example", { color: Logger.Colors.Green, showTimestamp: false, showLevel: false })
const OrbitDB = require('../../src/OrbitDB')

const network  = '178.62.241.75:3333'
const username = 'user1'
const password = ''
const channel  = 'browsertest1'
const key      = 'greeting'
const value    = 'Hello world'

try {
  const elm = document.getElementById("result")
  const ipfs = new IPFS()
  OrbitDB.connect(network, username, password, ipfs).then((orbit) => {
    orbit.kvstore(channel).then((db) => {
      let count = 1
      const query = () => {
        const startTime = new Date().getTime()
        db.put(key, value + " " + count).then((res) => {
          const endTime = new Date().getTime()
          logger.debug(`db.put (#${count}) took ${(endTime - startTime)} ms\n`)
          count ++

          const result = db.get(key)
          const output = `
          ---------------------------------------------------
          Key | Value
          ---------------------------------------------------
          ${key} | ${result}
          ---------------------------------------------------`

          elm.innerHTML = output.split("\n").join("<br>")
          logger.debug(output)
        }).catch((e) => logger.error(e.stack))
      }
      setInterval(query, 1000)
    })
  })
} catch(e) {
  logger.error(e.stack)
}
