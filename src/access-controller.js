'use strict'

class AccessController {
  /* Overridable functions */
  async load (accessControllerAddress) {}
  async save () {}
  async setup (options) {}
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
