import { CID } from 'multiformats/cid'
import { base58btc } from 'multiformats/bases/base58'

const IPFSBlockStorage = (next, { ipfs, timeout, pin }) => {
  const add = async (hash, data) => {
    const cid = CID.parse(hash, base58btc)
    await ipfs.block.put(data, {
      cid: cid.bytes,
      version: cid.version,
      format: 'dag-cbor',
      mhtype: 'sha2-256',
      pin,
      timeout
    })
    if (next) {
      return next.add(data)
    }
  }
  const get = async (hash) => {
    const cid = CID.parse(hash, base58btc)
    const block = await ipfs.block.get(cid, { timeout })
    if (block) {
      return block
    }
    if (next) {
      return next.get(hash)
    }
  }
  const merge = async (other) => {}
  const values = () => ({})
  return {
    add,
    get,
    merge,
    values
  }
}

export default IPFSBlockStorage
