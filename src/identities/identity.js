import * as Block from 'multiformats/block'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'

const codec = dagCbor
const hasher = sha256
const hashStringEncoding = base58btc

/**
 * @typedef {Object} module:Identities~Identity
 * @property {string} id A unique identifer for the identity.
 * @property {object} publicKey A public key.
 * @property {object} signatures A signed identity id and public key.
 * @property {string} type The type of identity provider.
 * @property {function} sign A sign function to sign data using this identity.
 * @property {function} verify A verify function to verify data signed by this identity.
 */
const Identity = async ({ id, publicKey, signatures, type, sign, verify } = {}) => {
  /**
   * @description The Identity instance. Returned by
   * [Identities.createIdentity()]{@link module:Identities~Identities#createIdentity}.
   */
  if (!id) throw new Error('Identity id is required')
  if (!publicKey) throw new Error('Invalid public key')
  if (!signatures) throw new Error('Signatures object is required')
  if (!signatures.id) throw new Error('Signature of id is required')
  if (!signatures.publicKey) throw new Error('Signature of publicKey+id is required')
  if (!type) throw new Error('Identity type is required')

  signatures = Object.assign({}, signatures)

  const identity = {
    id,
    publicKey,
    signatures,
    type,
    sign,
    verify
  }

  const { hash, bytes } = await _encodeIdentity(identity)
  identity.hash = hash
  identity.bytes = bytes

  return identity
}

const _encodeIdentity = async (identity) => {
  const { id, publicKey, signatures, type } = identity
  const value = { id, publicKey, signatures, type }
  const { cid, bytes } = await Block.encode({ value, codec, hasher })
  const hash = cid.toString(hashStringEncoding)
  return { hash, bytes: Uint8Array.from(bytes) }
}

const decodeIdentity = async (bytes) => {
  const { value } = await Block.decode({ bytes, codec, hasher })
  return Identity({ ...value })
}

/**
 * Verifies whether an identity is valid.
 * @param {Identity} identity The identity to verify.
 * @return {boolean} True if the identity is valid, false otherwise.
 * @static
 * @private
 */
const isIdentity = (identity) => {
  return Boolean(identity.id &&
    identity.hash &&
    identity.bytes &&
    identity.publicKey &&
    identity.signatures &&
    identity.signatures.id &&
    identity.signatures.publicKey &&
    identity.type)
}

/**
 * Evaluates whether two identities are equal.
 * @param {Identity} a First identity.
 * @param {Identity} b Second identity.
 * @return {boolean} True if identity a and b are equal, false otherwise.
 * @static
 * @private
 */
const isEqual = (a, b) => {
  return a.id === b.id &&
    a.hash === b.hash &&
    a.type === b.type &&
    a.publicKey === b.publicKey &&
    a.signatures.id === b.signatures.id &&
    a.signatures.publicKey === b.signatures.publicKey
}

export { Identity as default, isEqual, isIdentity, decodeIdentity }
