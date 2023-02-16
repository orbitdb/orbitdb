import isDefined from '../utils/is-defined.js'

class Identity {
  constructor (id, publicKey, idSignature, pubKeyIdSignature, type, signFn, verifyFn) {
    if (!isDefined(id)) {
      throw new Error('Identity id is required')
    }

    if (!isDefined(publicKey)) {
      throw new Error('Invalid public key')
    }

    if (!isDefined(idSignature)) {
      throw new Error('Signature of the id (idSignature) is required')
    }

    if (!isDefined(pubKeyIdSignature)) {
      throw new Error('Signature of (publicKey + idSignature) is required')
    }

    if (!isDefined(type)) {
      throw new Error('Identity type is required')
    }

    // if (!isDefined(provider)) {
    //   throw new Error('Identity provider is required')
    // }

    this._id = id
    this._publicKey = publicKey
    this._signatures = Object.assign({}, { id: idSignature }, { publicKey: pubKeyIdSignature })
    this._type = type
    // this._provider = provider
    this.hash = null
    this.sign = signFn
    this.verify = verifyFn
  }

  /**
  * This is only used as a fallback to the clock id when necessary
  * @return {string} public key hex encoded
  */
  get id () {
    return this._id
  }

  get publicKey () {
    return this._publicKey
  }

  get signatures () {
    return this._signatures
  }

  get type () {
    return this._type
  }

  // get provider () {
  //   return this._provider
  // }

  toJSON () {
    return {
      id: this.id,
      publicKey: this.publicKey,
      signatures: this.signatures,
      type: this.type
    }
  }

  static isEqual (a, b) {
    return a.id === b.id &&
           a.publicKey === b.publicKey &&
           a.signatures.id === b.signatures.id &&
           a.signatures.publicKey === b.signatures.publicKey
  }

  static isIdentity (identity) {
    return identity.id !== undefined &&
           identity.publicKey !== undefined &&
           identity.signatures !== undefined &&
           identity.signatures.id !== undefined &&
           identity.signatures.publicKey !== undefined &&
           identity.type !== undefined
  }

  static toJSON (identity) {
    return {
      id: identity.id,
      publicKey: identity.publicKey,
      signatures: identity.signatures,
      type: identity.type
    }
  }
}

export default Identity
