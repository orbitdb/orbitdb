/**
 * @namespace Storage-IPFS
 * @memberof module:Storage
 */
import { CID } from 'multiformats/cid'
import { base58btc } from 'multiformats/bases/base58'

const defaultTimeout = 30000

const IPFSBlockStorage = async ({ ipfs, timeout, pin } = {}) => {
  if (!ipfs) throw new Error('An instance of ipfs is required.')

  timeout = timeout || defaultTimeout

  const put = async (hash, data) => {
    const cid = CID.parse(hash, base58btc)
    await ipfs.block.put(data, {
      cid: cid.bytes,
      version: cid.version,
      format: 'dag-cbor',
      mhtype: 'sha2-256',
      pin,
      timeout
    })
  }

  const del = async (hash) => {}

  const get = async (hash) => {
    const cid = CID.parse(hash, base58btc)
    const block = await ipfs.block.get(cid, { timeout })
    if (block) {
      return block
    }
  }

  const iterator = async function * () {}

  const merge = async (other) => {}

  const clear = async () => {}

  const close = async () => {}

  return {
    put,
    del,
    get,
    iterator,
    merge,
    clear,
    close
  }
}

export default IPFSBlockStorage
