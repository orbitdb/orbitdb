import Entry from './entry.js'
import IPFSBlockStorage from './ipfs-block-storage.js'
import MemoryStorage from './memory-storage.js'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'
import * as Block from 'multiformats/block'

const codec = dagCbor
const hasher = sha256

const IdentityStorage = async ({ ipfs, storage } = {}) => {
  storage = storage
    ? storage
    : ipfs
      ? await IPFSBlockStorage({ ipfs, pin: true })
      : await MemoryStorage()

  const put = async (value) => {
    const { cid, bytes } = await Block.encode({ value, codec, hasher })
    const hash = cid.toString(base58btc)
    await storage.put(hash, bytes)
    return hash
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
