import IdentityProvider from './interface.js'
import * as u8a from 'uint8arrays'
import { DID } from 'dids'

const TYPE = 'DID'

class DIDIdentityProvider extends IdentityProvider {
  constructor ({ didProvider }) {
    super()
    this.did = new DID({
      resolver: DIDIdentityProvider.did._resolver,
      provider: didProvider
    })
  }

  static get type () {
    return TYPE
  }

  async getId ({ space }) {
    if (!this.did.authenticated) await this.did.authenticate()
    return this.did.id
  }

  async signIdentity (data, { space }) {
    if (!this.did.authenticated) await this.did.authenticate()
    const payload = u8a.toString(u8a.fromString(data, 'base16'), 'base64url')
    const jws = await this.did.createJWS(payload)
    // encode as JWS with detached payload
    return `${jws.signatures[0].protected}..${jws.signatures[0].signature}`
  }

  static setDIDResolver (resolver) {
    if (!this.did) {
      this.did = new DID({ resolver })
    } else {
      this.did.setResolver(resolver)
    }
  }

  static async verifyIdentity (identity) {
    if (!this.did) {
      throw new Error('The DID resolver must first be set with setDIDResolver()')
    }
    const data = identity.publicKey + identity.signatures.id
    try {
      const payload = u8a.toString(u8a.fromString(data, 'base16'), 'base64url')
      const [header, signature] = identity.signatures.publicKey.split('..')
      const jws = [header, payload, signature].join('.')
      await this.did.verifyJWS(jws)
    } catch (e) {
      return false
    }
    return true
  }
}

export default DIDIdentityProvider
