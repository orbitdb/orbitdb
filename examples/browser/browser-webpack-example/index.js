'use strict'

/*
  This is the entry point for Webpack to build the bundle from.
  We use the same example code as the html browser example,
  but we inject the Node.js modules of OrbitDB and IPFS into
  the example. 

  In the html example, IPFS and OrbitDB are loaded from the
  minified distribution builds (in '../lib')
 */

const IPFS = require('ipfs')
const OrbitDB = require('../../../src/OrbitDB')
const example = require('../example')

// Call the start function and pass in the 
// IPFS and OrbitDB modules
example(IPFS, OrbitDB)
