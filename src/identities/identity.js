import * as Block from 'multiformats/block'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'
import isDefined from '../utils/is-defined.js'

const codec = dagCbor
const hasher = sha256
const hashStringEncoding = base58btc

const isEqual = (a, b) => {
  return a.id === b.id &&
    a.publicKey === b.publicKey &&
    a.signatures.id === b.signatures.id &&
    a.signatures.publicKey === b.signatures.publicKey
}

const isIdentity = (identity) => {
  return isDefined(identity.id) &&
    isDefined(identity.publicKey) &&
    isDefined(identity.signatures) &&
    isDefined(identity.signatures.id) &&
    isDefined(identity.signatures.publicKey) &&
    isDefined(identity.type)
}

/**
 * Encode an Identity to a serializable form
 * @param {Identity} identity Identity to encode
 * @returns {Object} Object with fields hash and bytes
 */
const encodeIdentity = async (identity) => {
  const { id, publicKey, signatures, type } = identity
  const value = { id, publicKey, signatures, type }
  const { cid, bytes } = await Block.encode({ value, codec, hasher })
  const hash = cid.toString(hashStringEncoding)
  return { hash, bytes }
}

/**
 * Decode an Identity from bytes
 * @param {Uint8Array} bytes Bytes from which to decode an Identity from
 * @returns {Identity}
 */
const decodeIdentity = async (bytes) => {
  const { value } = await Block.decode({ bytes, codec, hasher })
  const { id, publicKey, signatures, type } = value
  return Identity({
    id,
    publicKey,
    idSignature: signatures.id,
    publicKeyAndIdSignature: signatures.publicKey,
    type
  })
}

const Identity = async ({ id, publicKey, idSignature, publicKeyAndIdSignature, type, sign, verify } = {}) => {
  if (!isDefined(id)) {
    throw new Error('Identity id is required')
  }

  if (!isDefined(publicKey)) {
    throw new Error('Invalid public key')
  }

  if (!isDefined(idSignature)) {
    throw new Error('Signature of the id (idSignature) is required')
  }

  if (!isDefined(publicKeyAndIdSignature)) {
    throw new Error('Signature of (publicKey + idSignature) is required')
  }

  if (!isDefined(type)) {
    throw new Error('Identity type is required')
  }

  const signatures = Object.assign({}, { id: idSignature }, { publicKey: publicKeyAndIdSignature })

  const identity = {
    id,
    publicKey,
    signatures,
    type,
    sign,
    verify
  }

  const { hash, bytes } = await encodeIdentity(identity)
  identity.hash = hash
  identity.bytes = bytes

  return identity
}

export { Identity as default, isEqual, isIdentity, encodeIdentity, decodeIdentity }
