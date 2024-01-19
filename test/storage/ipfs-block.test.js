import { strictEqual, notStrictEqual } from 'assert'
import * as Block from 'multiformats/block'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'
import createHelia from '../utils/create-helia.js'
import IPFSBlockStorage from '../../src/storage/ipfs-block.js'

describe('IPFSBlockStorage', function () {
  const codec = dagCbor
  const hasher = sha256

  let ipfs, storage

  beforeEach(async () => {
    ipfs = await createHelia()
    const pin = true
    const timeout = 1000

    storage = await IPFSBlockStorage({ ipfs, pin, timeout })
  })

  afterEach(async () => {
    await ipfs.stop()
  })

  it('gets a block', async () => {
    const expected = 'hello world'
    const block = await Block.encode({ value: expected, codec, hasher })
    const cid = block.cid.toString(base58btc)

    await storage.put(cid, 'hello world')
    const actual = await storage.get(cid)

    strictEqual(actual, expected)
  })

  it('throws an error if a block does not exist', async () => {
    const value = 'i don\'t exist'
    const block = await Block.encode({ value, codec, hasher })
    const cid = block.cid.toString(base58btc)

    let err = null

    try {
      await storage.get(cid)
    } catch (error) {
      err = error
    }

    notStrictEqual(err, null)
    strictEqual(err.message, 'All promises were rejected')
  })
})
