import Entry from './entry.js'
import IPFSBlockStorage from './ipfs-block-storage.js'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'
import * as Block from 'multiformats/block'

const codec = dagCbor
const hasher = sha256

const IdentityStorage = async ({ storage }) => {
  const put = async (identity) => {
    const { cid, bytes } = await Block.encode({ value: identity.toJSON(), codec, hasher })
    await storage.put(cid.toString(base58btc), bytes)
  }
  
  const get = async (hash) => {
    const bytes = await storage.get(hash)

    if (bytes) {
      const { value } = await Block.decode({ bytes, codec, hasher })
      return value 
    }
  }

  return {
    put,
    get
  }
}

export default IdentityStorage
