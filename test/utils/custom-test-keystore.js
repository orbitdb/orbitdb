const EC = require('elliptic').ec
const ec = new EC('secp256k1')
const IdentityProvider = require('orbit-db-identity-provider/src/identity-provider-interface')
/**
 * A custom keystore example
 */
class CustomTestKeystore {
  constructor (storage) {
    // Use just one key throughout the keystore
    // for mock purposes
    this.key = this.createKey()
  }

  hasKey () {
    return this.key !== undefined ? true : false
  }

  createKey (id) {
    const key = ec.genKeyPair()
    const keyPair = {
      public:  {
        marshal: () => key.getPublic('hex')
      },
      priv: key.getPrivate('hex'),
      privEnc: 'hex',
      pubEnc: 'hex',
    }

    return keyPair
  }

  getKey (id) {
    return this.key
  }

  sign (key, data) {
    return Promise.resolve('<signature>')
  }

  verify (signature, publicKey, data) {
    return Promise.resolve(true)
  }
    
  getPublic (key) {
    return key.public.marshal()
  }
}

class CustomIdProvider extends IdentityProvider {
  constructor (options = {}) {
    super()
    this._keystore = options.keystore || new CustomTestKeystore()
  }

  // Returns the type of the identity provider
  static get type () { return 'custom' }

  async getId (options = {}) {
    return 'id'
  }

  async signIdentity (data, options = {}) {
    const keystore = this._keystore
    return keystore.sign(null, data)
  }

  static async verifyIdentity (identity) {
    // Verify that identity was signed by the ID
    return true
  }
}

module.exports = (LocalStorage, mkdir) => {
  return {
    create: (directory) => {
      return new CustomTestKeystore()
    },
    identityProvider: CustomIdProvider
  }
}
