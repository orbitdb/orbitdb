import * as Block from 'multiformats/block'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'

const codec = dagCbor
const hasher = sha256
const hashStringEncoding = base58btc

const Identity = async ({ id, publicKey, signatures, type, sign, verify } = {}) => {
  if (id == null) throw new Error('Identity id is required')
  if (publicKey == null) throw new Error('Invalid public key')
  if (signatures == null) throw new Error('Signatures object is required')
  if (signatures.id == null) throw new Error('Signature of id is required')
  if (signatures.publicKey == null) throw new Error('Signature of publicKey+id is required')
  if (type == null) throw new Error('Identity type is required')

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

/**
 * Encode an Identity to a serializable form
 * @param {Identity} identity Identity to encode
 * @returns {Object} Object with fields hash and bytes
 */
const _encodeIdentity = async (identity) => {
  const { id, publicKey, signatures, type } = identity
  const value = { id, publicKey, signatures, type }
  const { cid, bytes } = await Block.encode({ value, codec, hasher })
  const hash = cid.toString(hashStringEncoding)
  return { hash, bytes: Uint8Array.from(bytes) }
}

/**
 * Decode an Identity from bytes
 * @param {Uint8Array} bytes Bytes from which to decode an Identity from
 * @returns {Identity}
 */
const decodeIdentity = async (bytes) => {
  const { value } = await Block.decode({ bytes, codec, hasher })
  return Identity({ ...value })
}

const isIdentity = (identity) => {
  return identity.id != null &&
    identity.hash != null &&
    identity.bytes != null &&
    identity.publicKey != null &&
    identity.signatures != null &&
    identity.signatures.id != null &&
    identity.signatures.publicKey != null &&
    identity.type != null
}

const isEqual = (a, b) => {
  return a.id === b.id &&
    a.hash === b.hash &&
    a.type === b.type &&
    a.publicKey === b.publicKey &&
    a.signatures.id === b.signatures.id &&
    a.signatures.publicKey === b.signatures.publicKey
}

export { Identity as default, isEqual, isIdentity, decodeIdentity }
