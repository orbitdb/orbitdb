'use strict'

const assert = require('assert')
const { AccessControllers, Identities } = require('../src/OrbitDB')

describe('Re-exports', function () {
  it('Successfully re-exports AccessControllers', () => {
    assert.strictEqual(typeof AccessControllers, 'function')
    assert.strictEqual(typeof AccessControllers.addAccessController, 'function')
  })

  it('Successfully re-exports Identities', () => {
    assert.strictEqual(typeof Identities, 'function')
    assert.strictEqual(typeof Identities.createIdentity, 'function')
  })
})
