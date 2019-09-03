'use strict'
const isNode = require('is-node')
// This file will be picked up by webpack into the
// tests bundle and the code here gets run when imported
// into the browser tests index through browser/run.js
if (!isNode) {
  require('source-map-support').install();
}
