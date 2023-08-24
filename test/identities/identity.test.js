import assert from 'assert'
import { Identity, isIdentity, isEqual } from '../../src/identities/index.js'
import { decodeIdentity } from '../../src/identities/identity.js'

describe('Identity', function () {
  const id = '0x01234567890abcdefghijklmnopqrstuvwxyz'
  const publicKey = '<pubkey>'
  const signatures = {
    id: 'signature for <id>',
    publicKey: 'signature for <publicKey + idSignature>'
  }
  const type = 'orbitdb'
  // const provider = 'IdentityProviderInstance'

  const expectedHash = 'zdpuArx43BnXdDff5rjrGLYrxUomxNroc2uaocTgcWK76UfQT'
  const expectedBytes = Uint8Array.from([
    164, 98, 105, 100, 120, 39, 48, 120, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 48, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 100, 116, 121, 112, 101, 103, 111, 114, 98, 105, 116, 100, 98, 105, 112, 117, 98, 108, 105, 99, 75, 101, 121, 104, 60, 112, 117, 98, 107, 101, 121, 62, 106, 115, 105, 103, 110, 97, 116, 117, 114, 101, 115, 162, 98, 105, 100, 114, 115, 105, 103, 110, 97, 116, 117, 114, 101, 32, 102, 111, 114, 32, 60, 105, 100, 62, 105, 112, 117, 98, 108, 105, 99, 75, 101, 121, 120, 39, 115, 105, 103, 110, 97, 116, 117, 114, 101, 32, 102, 111, 114, 32, 60, 112, 117, 98, 108, 105, 99, 75, 101, 121, 32, 43, 32, 105, 100, 83, 105, 103, 110, 97, 116, 117, 114, 101, 62
  ])

  let identity

  before(async () => {
    identity = await Identity({ id, publicKey, signatures, type })
  })

  it('has the correct id', async () => {
    assert.strictEqual(identity.id, id)
  })

  it('has the correct publicKey', async () => {
    assert.strictEqual(identity.publicKey, publicKey)
  })

  it('has the correct idSignature', async () => {
    assert.strictEqual(identity.signatures.id, signatures.id)
  })

  it('has the correct publicKeyAndIdSignature', async () => {
    assert.strictEqual(identity.signatures.publicKey, signatures.publicKey)
  })

  // it('has the correct provider', async () => {
  //   assert.deepStrictEqual(identity.provider, provider)
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
        identity = await Identity({ id: 'abc' })
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
      assert.strictEqual(err, 'Error: Signatures object is required')
    })

    it('throws and error if signature for id was not given in constructor', async () => {
      let err
      try {
        identity = await Identity({ id: 'abc', publicKey, signatures: {} })
      } catch (e) {
        err = e.toString()
      }
      assert.strictEqual(err, 'Error: Signature of id is required')
    })

    it('throws and error if signature for publicKey was not given in constructor', async () => {
      let err
      try {
        identity = await Identity({ id: 'abc', publicKey, signatures: { id: signatures.id } })
      } catch (e) {
        err = e.toString()
      }
      assert.strictEqual(err, 'Error: Signature of publicKey+id is required')
    })

    it('throws and error if signature for publicKey was not given in constructor', async () => {
      let err
      try {
        identity = await Identity({ id: 'abc', publicKey, signatures: { publicKey: signatures.publicKey } })
      } catch (e) {
        err = e.toString()
      }
      assert.strictEqual(err, 'Error: Signature of id is required')
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
        identity = await Identity({ id: 'abc', publicKey, signatures })
      } catch (e) {
        err = e.toString()
      }
      assert.strictEqual(err, 'Error: Identity type is required')
    })
  })

  describe('isIdentity', () => {
    describe('valid Identity', () => {
      it('is a valid identity', async () => {
        const identity = await Identity({ id, publicKey, signatures, type })
        const result = isIdentity(identity)
        assert.strictEqual(result, true)
      })
    })

    describe('invalid Identity', () => {
      beforeEach(async () => {
        identity = await Identity({ id, publicKey, signatures, type })
      })

      it('is not a valid identity if id is missing', async () => {
        delete identity.id
        const result = isIdentity(identity)
        assert.strictEqual(result, false)
      })

      it('is not a valid identity if hash is missing', async () => {
        delete identity.hash
        const result = isIdentity(identity)
        assert.strictEqual(result, false)
      })

      it('is not a valid identity if bytes are missing', async () => {
        delete identity.bytes
        const result = isIdentity(identity)
        assert.strictEqual(result, false)
      })

      it('is not a valid identity if publicKey is missing', async () => {
        delete identity.publicKey
        const result = isIdentity(identity)
        assert.strictEqual(result, false)
      })

      it('is not a valid identity if signatures is missing', async () => {
        delete identity.signatures
        const result = isIdentity(identity)
        assert.strictEqual(result, false)
      })

      it('is not a valid identity if signature for id is missing', async () => {
        delete identity.signatures.id
        const result = isIdentity(identity)
        assert.strictEqual(result, false)
      })

      it('is not a valid identity if signature for publicKey is missing', async () => {
        delete identity.signatures.publicKey
        const result = isIdentity(identity)
        assert.strictEqual(result, false)
      })

      it('is not a valid identity if type is missing', async () => {
        delete identity.type
        const result = isIdentity(identity)
        assert.strictEqual(result, false)
      })
    })
  })

  describe('isEqual', () => {
    describe('equal identities', () => {
      it('identities are equal', async () => {
        const identity1 = await Identity({ id, publicKey, signatures, type })
        const identity2 = await Identity({ id, publicKey, signatures, type })
        const result = isEqual(identity1, identity2)
        assert.strictEqual(result, true)
      })
    })

    describe('not equal identities', () => {
      let identity1, identity2

      before(async () => {
        identity1 = await Identity({ id, publicKey, signatures, type })
        identity2 = await Identity({ id, publicKey, signatures, type })
      })

      it('identities are not equal if id is different', async () => {
        identity2 = await Identity({ id: 'X', publicKey, signatures, type })
        const result = isEqual(identity1, identity2)
        assert.strictEqual(result, false)
      })

      it('identities are not equal if hash is different', async () => {
        identity2 = await Identity({ id, publicKey, signatures, type })
        identity2.hash = 'notthesame'
        const result = isEqual(identity1, identity2)
        assert.strictEqual(result, false)
      })

      it('identities are not equal if type is different', async () => {
        identity2 = await Identity({ id, publicKey, signatures, type })
        identity2.type = 'some other identity provider than orbitdb'
        const result = isEqual(identity1, identity2)
        assert.strictEqual(result, false)
      })

      it('identities are not equal if publicKey is different', async () => {
        identity2 = await Identity({ id, publicKey: 'XYZ', signatures, type })
        const result = isEqual(identity1, identity2)
        assert.strictEqual(result, false)
      })

      it('identities are not equal if id signature is different', async () => {
        identity2 = await Identity({ id, publicKey, signatures: { id: 'different id signature', publicKey: signatures.publicKey }, type })
        const result = isEqual(identity1, identity2)
        assert.strictEqual(result, false)
      })

      it('identities are not equal if publicKey signature is different', async () => {
        identity2 = await Identity({ id, publicKey, signatures: { id: signatures.id, publicKey: 'different publicKey signature' }, type })
        const result = isEqual(identity1, identity2)
        assert.strictEqual(result, false)
      })
    })
  })

  describe('Decode Identity', () => {
    before(async () => {
      identity = await Identity({ id, publicKey, signatures, type })
    })

    it('decodes an identity from bytes', async () => {
      const result = await decodeIdentity(expectedBytes)

      assert.strictEqual(isIdentity(result), true)
      assert.strictEqual(result.id, id)
      assert.strictEqual(result.publicKey, publicKey)
      assert.strictEqual(result.type, type)
      assert.strictEqual(result.hash, expectedHash)
      assert.strictEqual(result.sign, undefined)
      assert.strictEqual(result.verify, undefined)
      assert.deepStrictEqual(result.bytes, expectedBytes)
      assert.deepStrictEqual(result.signatures, signatures)
    })
  })
})
