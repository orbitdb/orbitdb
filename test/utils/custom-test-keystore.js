const EC = require('elliptic').ec
const ec = new EC('secp256k1')

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
    const keyPair = ec.keyPair({
      pub:  key.getPublic('hex'),
      priv: key.getPrivate('hex'),
      privEnc: 'hex',
      pubEnc: 'hex',
    })

    return keyPair
  }

  getKey (id) {
    return this.key
  }

  sign (key, data) {
    return Promise.resolve('<signature>')
    const sig = ec.sign(data, key)
    return Promise.resolve(sig.toDER('hex'))
  }

  verify (signature, publicKey, data) {
    return Promise.resolve(true)
  }
}

module.exports = (LocalStorage, mkdir) => {
  return {
    create: (directory) => {
      return new CustomTestKeystore()
    }
  }
}
