'use strict'

const IpfsNodeDaemon = require('ipfs-daemon/src/ipfs-node-daemon')
const IpfsNativeDaemon = require('ipfs-daemon/src/ipfs-native-daemon')

// module.exports = [IpfsNodeDaemon]
// module.exports = [IpfsNativeDaemon]
// module.exports = [IpfsNativeDaemon, IpfsNodeDaemon]
module.exports = [IpfsNodeDaemon, IpfsNativeDaemon]
