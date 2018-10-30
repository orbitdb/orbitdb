'use strict'

class AccessController {
  /* Overridable functions */
  async load (accessControllerAddress) {}
  async setup (options) {}
  async save () {}
  async grant (permission, identity) {}
  async revoke (permission, identity) {}
  async canAppend (entry, identityProvider) {}

  async add(access, key) {
    return this.grant(access, key)
  }

  async remove(access, key) {
    return this.revoke(access, key)
  }
}

module.exports = AccessController
