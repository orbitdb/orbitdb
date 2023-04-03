import * as Block from 'multiformats/block'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'

const codec = dagCbor
const hasher = sha256
const hashStringEncoding = base58btc

// Creates a DB manifest file and saves it in IPFS
export default async ({ storage, name, type, accessController, meta }) => {
  if (!storage) throw new Error('storage is required')
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
  return { hash, manifest }
}
