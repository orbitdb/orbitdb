class IdentityProvider {
  /* Return id of identity (to be signed by orbit-db public key) */
  async getId (options) {}

  /* Return signature of OrbitDB public key signature */
  async signIdentity (data, options) {}

  /* Verify a signature of OrbitDB public key signature */
  static async verifyIdentity (identity) {}

  /* Return the type for this identity provider */
  static get type () {
    throw new Error('\'static get type ()\' needs to be defined in the inheriting class')
  }

  /*
    Return the type for this identity-procider
    NOTE! This is the only property of the interface that
    shouldn't be overridden in the inherited IdentityProvider
  */
  get type () {
    return this.constructor.type
  }
}

export default IdentityProvider
