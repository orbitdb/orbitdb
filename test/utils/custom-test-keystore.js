const EC = require('elliptic').ec
const ec = new EC('secp256k1')

/**
 * A custom keystore example
 */
class CustomTestKeystore {
  constructor(signer) {
    this.createKey();
  }

  createKey() {
    const key = ec.genKeyPair()
    this.key = ec.keyPair({
      pub:  key.getPublic('hex'),
      priv: key.getPrivate('hex'),
      privEnc: 'hex',
      pubEnc: 'hex',
    })

    return this.key
  }

  getKey() {
    return this.key
  }

  // TODO: check if this is really in use
  generateKey() {
    return Promise.resolve(this.createKey())
  }

  importPublicKey(key) {
    return Promise.resolve(ec.keyFromPublic(key, 'hex'))
  }

  importPrivateKey(key) {
    return Promise.resolve(ec.keyFromPrivate(key, 'hex'))
  }

  sign(key, data) {
    const sig = ec.sign(data, key)
    return Promise.resolve(sig.toDER('hex'))
  }

  verify(signature, key, data) {
    let res = false
    res = ec.verify(data, signature, key)
    return Promise.resolve(res)
  }
}

module.exports = new CustomTestKeystore()
