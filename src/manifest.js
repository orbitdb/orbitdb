/**
 * @module Manifest
 * @description
 * A manifest provides an OrbitDB database with various descriptive information
 * including access controls and metadata.
 */
import * as Block from 'multiformats/block'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'
import { ComposedStorage, IPFSBlockStorage, LRUStorage } from './storage/index.js'

const codec = dagCbor
const hasher = sha256
const hashStringEncoding = base58btc

/**
 * Creates a DB manifest file and saves it in IPFS.
 * @function
 * @param {Object} params One or more parameters for configuring Manifest.
 * @param {IPFS} params.ipfs An instance of IPFS.
 * @param {module:Storage} [param.storage=module:Storage.Storage-ComposedStorage] An instance of Storage.
 * @returns {module:Manifest} An instance of Manifest.
 * @instance
 */
const Manifest = async ({ ipfs, storage } = {}) => {
  /**
   * @namespace module:Manifest~Manifest
   * @description The instance returned by {@link module:Manifest~Manifest}.
   */

  storage = storage || await ComposedStorage(
    await LRUStorage({ size: 1000 }),
    await IPFSBlockStorage({ ipfs, pin: true })
  )

  /**
   * Gets the manifest data from the underlying storage.
   * @param {string} address The address of the manifest.
   * @returns {*} The manifest data.
   * @memberof module:Manifest~Manifest
   */
  const get = async (address) => {
    const bytes = await storage.get(address)
    const { value } = await Block.decode({ bytes, codec, hasher })
    return value
  }

  /**
   * Creates a valid manifest.
   * @param {Object} params One or more parameters for configuring Manifest.
   * @param {string} name The name of the database.
   * @param {string} type The type of the database.
   * @param {string} accessController The type of access controller.
   * @param {Object} meta Metadata.
   * @returns {Object} A hash and manifest.
   * @throws name is required if no name is provided.
   * @throws type is required if no type is provided.
   * @throws accessController is required if no access controller is provided.
   * @memberof module:Manifest~Manifest
   */
  const create = async ({ name, type, accessController, meta }) => {
    if (!name) throw new Error('name is required')
    if (!type) throw new Error('type is required')
    if (!accessController) throw new Error('accessController is required')

    const manifest = Object.assign(
      {
        name,
        type,
        accessController
      },
      // meta field is only added to manifest if meta parameter is defined
      meta !== undefined ? { meta } : {}
    )

    const { cid, bytes } = await Block.encode({ value: manifest, codec, hasher })
    const hash = cid.toString(hashStringEncoding)
    await storage.put(hash, bytes)

    return {
      hash,
      manifest
    }
  }

  /**
   * Closes the underlying storage.
   * @memberof module:Manifest~Manifest
   */
  const close = async () => {
    await storage.close()
  }

  return {
    get,
    create,
    close
  }
}

export default Manifest
