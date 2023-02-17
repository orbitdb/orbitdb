import assert from 'assert'
import { Identity } from '../../src/identities/index.js'

describe('Identity', function () {
  const id = '0x01234567890abcdefghijklmnopqrstuvwxyz'
  const publicKey = '<pubkey>'
  const idSignature = 'signature for <id>'
  const publicKeyAndIdSignature = 'signature for <publicKey + idSignature>'
  const type = 'orbitdb'
  const provider = 'IdentityProviderInstance'

  let identity

  before(async () => {
    identity = await Identity({ id, publicKey, idSignature, publicKeyAndIdSignature, type })
  })

  it('has the correct id', async () => {
    assert.strictEqual(identity.id, id)
  })

  it('has the correct publicKey', async () => {
    assert.strictEqual(identity.publicKey, publicKey)
  })

  it('has the correct idSignature', async () => {
    assert.strictEqual(identity.signatures.id, idSignature)
  })

  it('has the correct publicKeyAndIdSignature', async () => {
    assert.strictEqual(identity.signatures.publicKey, publicKeyAndIdSignature)
  })

  // it('has the correct provider', async () => {
  //   assert.deepStrictEqual(identity.provider, provider)
  // })

  // it('converts identity to a JSON object', async () => {
  //   const expected = {
  //     id,
  //     publicKey,
  //     signatures: { id: idSignature, publicKey: publicKeyAndIdSignature },
  //     type
  //   }
  //   assert.deepStrictEqual(identity.toJSON(), expected)
  // })

  describe('Constructor inputs', () => {
    it('throws and error if id was not given in constructor', async () => {
      let err
      try {
        identity = await Identity()
      } catch (e) {
        err = e.toString()
      }
      assert.strictEqual(err, 'Error: Identity id is required')
    })

    it('throws and error if publicKey was not given in constructor', async () => {
      let err
      try {
        identity = await Identity({ id: 'abc'})
      } catch (e) {
        err = e.toString()
      }
      assert.strictEqual(err, 'Error: Invalid public key')
    })

    it('throws and error if identity signature was not given in constructor', async () => {
      let err
      try {
        identity = await Identity({ id: 'abc', publicKey })
      } catch (e) {
        err = e.toString()
      }
      assert.strictEqual(err, 'Error: Signature of the id (idSignature) is required')
    })

    it('throws and error if identity signature was not given in constructor', async () => {
      let err
      try {
        identity = await Identity({ id: 'abc', publicKey, idSignature })
      } catch (e) {
        err = e.toString()
      }
      assert.strictEqual(err, 'Error: Signature of (publicKey + idSignature) is required')
    })

    // it('throws and error if identity provider was not given in constructor', async () => {
    //   let err
    //   try {
    //     identity = new Identity('abc', publicKey, idSignature, publicKeyAndIdSignature, type)
    //   } catch (e) {
    //     err = e.toString()
    //   }
    //   assert.strictEqual(err, 'Error: Identity provider is required')
    // })

    it('throws and error if identity type was not given in constructor', async () => {
      let err
      try {
        identity = await Identity({ id: 'abc', publicKey, idSignature, publicKeyAndIdSignature })
      } catch (e) {
        err = e.toString()
      }
      assert.strictEqual(err, 'Error: Identity type is required')
    })
  })
})
