// import * as io from '../utils/index.js'
// import AccessController from './interface.js'
// import AccessControllerManifest from './manifest.js'
import { IPFSBlockStorage } from '../storage/index.js'
import * as Block from 'multiformats/block'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'

const codec = dagCbor
const hasher = sha256
const hashStringEncoding = base58btc

const type = 'ipfs'

const AccessControllerManifest = async ({ storage, type, params }) => {
  const manifest = {
    type,
    ...params
  }
  const { cid, bytes } = await Block.encode({ value: manifest, codec, hasher })
  const hash = cid.toString(hashStringEncoding)
  await storage.put(hash, bytes)
  return hash
}

const IPFSAccessController = async ({ ipfs, identities, identity, address, storage, write }) => {
  storage = storage || await IPFSBlockStorage({ ipfs, pin: true })

  write = write || [identity.id]

  if (address) {
    const manifestBytes = await storage.get(address)
    const { value } = await Block.decode({ bytes: manifestBytes, codec, hasher })
    write = value.write
  } else {
    address = await AccessControllerManifest({ storage, type, params: { write } })
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

export { IPFSAccessController as default }
