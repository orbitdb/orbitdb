/**
 * @namespace module:Log~Entry
 * @memberof module:Log
 * @description Log Entry
 */
import Clock from './clock.js'
import * as Block from 'multiformats/block'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'

const codec = dagCbor
const hasher = sha256
const hashStringEncoding = base58btc

/**
 * Create an Entry
 * @param {Identity} identity The identity instance
 * @param {string} logId The unique identifier for this log
 * @param {*} data Data of the entry to be added. Can be any JSON.stringifyable data
 * @param {Clock} [clock] The clock
 * @param {Array<string|Entry>} [next=[]] An array of CIDs as base58btc encoded strings
 * @param {Array<string|Entry>} [refs=[]] An array of CIDs as base58btc encoded strings
 * @returns {Promise<Entry>}
 * @example
 * const entry = await Entry.create(identity, 'log1', 'hello')
 * console.log(entry)
 * // { payload: "hello", next: [], ... }
 */
const create = async (identity, id, payload, clock = null, next = [], refs = []) => {
  if (identity == null) throw new Error('Identity is required, cannot create entry')
  if (id == null) throw new Error('Entry requires an id')
  if (payload == null) throw new Error('Entry requires a payload')
  if (next == null || !Array.isArray(next)) throw new Error("'next' argument is not an array")

  clock = clock || new Clock(identity.publicKey)

  const entry = {
    id, // For determining a unique chain
    payload, // Can be any dag-cbor encodeable data
    next, // Array of strings of CIDs
    refs, // Array of strings of CIDs
    clock, // Clock
    v: 2 // To tag the version of this data structure
  }

  const { bytes } = await Block.encode({ value: entry, codec, hasher })
  const signature = await identity.sign(identity, bytes)

  entry.key = identity.publicKey
  entry.identity = identity.hash
  entry.sig = signature

  return _encodeEntry(entry)
}

/**
 * Verifies an entry signature.
 *
 * @param {Identities} identities Identities system to use
 * @param {Entry} entry The entry being verified
 * @return {Promise} A promise that resolves to a boolean value indicating if the signature is valid
 */
const verify = async (identities, entry) => {
  if (!identities) throw new Error('Identities is required, cannot verify entry')
  if (!isEntry(entry)) throw new Error('Invalid Log entry')
  if (!entry.key) throw new Error("Entry doesn't have a key")
  if (!entry.sig) throw new Error("Entry doesn't have a signature")

  const value = {
    id: entry.id,
    payload: entry.payload,
    next: entry.next,
    refs: entry.refs,
    clock: entry.clock,
    v: entry.v
  }

  const { bytes } = await Block.encode({ value, codec, hasher })

  return identities.verify(entry.sig, entry.key, bytes)
}

/**
 * Check if an object is an Entry.
 * @param {Entry} obj
 * @returns {boolean}
 */
const isEntry = (obj) => {
  return obj && obj.id !== undefined &&
    obj.next !== undefined &&
    obj.payload !== undefined &&
    obj.v !== undefined &&
    obj.clock !== undefined &&
    obj.refs !== undefined
}

const isEqual = (a, b) => {
  return a && b && a.hash === b.hash
}

/**
 * Decode a serialized Entry from bytes
 * @param {Uint8Array} bytes
 * @returns {Entry}
 */
const decode = async (bytes) => {
  const { value } = await Block.decode({ bytes, codec, hasher })
  return _encodeEntry(value)
}

/**
 * Encode an Entry to a serializable form
 * @param {Entry} entry
 * @returns {TODO}
 */
const _encodeEntry = async (entry) => {
  const { cid, bytes } = await Block.encode({ value: entry, codec, hasher })
  const hash = cid.toString(hashStringEncoding)
  const clock = new Clock(entry.clock.id, entry.clock.time)
  return {
    ...entry,
    clock,
    hash,
    bytes
  }
}

export default {
  create,
  verify,
  decode,
  isEntry,
  isEqual
}
