'use strict'

const IpfsNodeDaemon = require('ipfs-daemon/src/ipfs-node-daemon')
const IpfsNativeDaemon = require('ipfs-daemon/src/ipfs-native-daemon')
const testDaemons = require('./test-daemons')

// Set logplease logging level if in the browser
if (typeof window !== 'undefined') 
  window.LOG = 'ERROR'

// Config
module.exports = {
  daemons: testDaemons,
  timeout: 60000,
  defaultIpfsDirectory: './ipfs',
  defaultOrbitDBDirectory: './orbit-db',
  dbname: 'abcdefghijklmn',
}
