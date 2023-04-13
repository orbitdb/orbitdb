/**
 * @namespace AccessControllers-IPFS
 * @memberof module:AccessControllers
 */
import { IPFSBlockStorage, LRUStorage, ComposedStorage } from '../storage/index.js'
import * as Block from 'multiformats/block'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'
import pathJoin from '../utils/path-join.js'

const codec = dagCbor
const hasher = sha256
const hashStringEncoding = base58btc

const AccessControlList = async ({ storage, type, params }) => {
  const manifest = {
    type,
    ...params
  }
  const { cid, bytes } = await Block.encode({ value: manifest, codec, hasher })
  const hash = cid.toString(hashStringEncoding)
  await storage.put(hash, bytes)
  return hash
}

const type = 'ipfs'

const IPFSAccessController = ({ write, storage } = {}) => async ({ orbitdb, identities, address }) => {
  storage = storage || await ComposedStorage(
    await LRUStorage({ size: 1000 }),
    await IPFSBlockStorage({ ipfs: orbitdb.ipfs, pin: true })
  )
  write = write || [orbitdb.identity.id]

  if (address) {
    const manifestBytes = await storage.get(address.replaceAll('/ipfs/', ''))
    const { value } = await Block.decode({ bytes: manifestBytes, codec, hasher })
    write = value.write
  } else {
    address = await AccessControlList({ storage, type, params: { write } })
    address = pathJoin('/', type, address)
  }

  const canAppend = async (entry) => {
    const writerIdentity = await identities.getIdentity(entry.identity)
    if (!writerIdentity) {
      return false
    }
    const { id } = writerIdentity
    // Allow if the write access list contain the writer's id or is '*'
    if (write.includes(id) || write.includes('*')) {
      // Check that the identity is valid
      return identities.verifyIdentity(writerIdentity)
    }
    return false
  }

  return {
    type,
    address,
    write,
    canAppend
  }
}

export default IPFSAccessController
