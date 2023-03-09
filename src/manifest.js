import path from 'path'

import * as Block from 'multiformats/block'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'

const codec = dagCbor
const hasher = sha256
const hashStringEncoding = base58btc

// Creates a DB manifest file and saves it in IPFS
export default async (storage, name, type, accessControllerAddress, { meta } = {}) => {
  const manifest = Object.assign(
    {
      name,
      type,
      accessController: (path.posix || path).join('/ipfs', accessControllerAddress)
    },
    // meta field is only added to manifest if meta parameter is defined
    meta !== undefined ? { meta } : {}
  )

  const { cid, bytes } = await Block.encode({ value: manifest, codec, hasher })
  const hash = cid.toString(hashStringEncoding)
  await storage.put(hash, bytes)
  return { hash, manifest }
}
