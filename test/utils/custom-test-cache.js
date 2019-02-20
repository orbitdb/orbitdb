const OrbitDbCache = require('orbit-db-cache/Cache.js')
const localdown = require('localstorage-down')

/**
 * A custom cache example. To create a differing custom example, orbitdb cache was
 * used with another abstract-leveldown compliant storage, localdown as an example
 */

module.exports = OrbitDbCache(localdown)
