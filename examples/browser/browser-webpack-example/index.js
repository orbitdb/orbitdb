'use strict'

/*
  This is the entry point for Webpack to build the bundle from.
  We use the same example code as the html browser example,
  but we inject the Node.js modules of OrbitDB and IPFS into
  the example. 

  In the html example, IPFS and OrbitDB are loaded by ../browser.html from the
  minified distribution builds
 */

// Import IPFS module
import IPFS from 'ipfs'

// Import OrbitDB module from 'orbit-db', eg. directory to its package.json
import OrbitDB from '../../..'

// When 'orbit-db' was installed from npm, use with:
// import OrbitDB from 'orbit-db' 

// Example main code
const example = require('../example')

// Call the start function and pass in the 
// IPFS and OrbitDB modules
example(IPFS, OrbitDB)
