import { strictEqual, deepStrictEqual } from 'assert'
import rmrf from 'rimraf'
import * as IPFS from 'ipfs-core'
import Manifest from '../src/manifest.js'
import IPFSBlockStorage from '../src/storage/ipfs-block.js'
import config from './config.js'

describe('Manifest', () => {
  const repo = './ipfs'
  let ipfs
  let storage

  before(async () => {
    ipfs = await IPFS.create({ ...config.daemon1, repo })
    storage = await IPFSBlockStorage({ ipfs })
  })

  after(async () => {
    await storage.close()
    await ipfs.stop()
    await rmrf(repo)
  })

  it('creates a manifest', async () => {
    const name = 'manifest'
    const type = 'manifest'
    const accessController = 'test/default-access-controller'
    const expectedHash = 'zdpuAx3LaygjPHa2zsUmRoR4jQPm2WYrExsvz2gncfm62aRKv'
    const expectedManifest = {
      name,
      type,
      accessController
    }

    const { hash, manifest } = await Manifest({ storage, name, type, accessController })

    strictEqual(hash, expectedHash)
    deepStrictEqual(manifest, expectedManifest)
  })

  it('creates a manifest with metadata', async () => {
    const name = 'manifest'
    const type = 'manifest'
    const accessController = 'test/default-access-controller'
    const expectedHash = 'zdpuAmegd2PpDfTQRVhGiATCkWQDvp3JygT9WksWgJkG2u313'
    const meta = { name, description: 'more information about the database' }

    const { hash, manifest } = await Manifest({ storage, name, type, accessController, meta })

    strictEqual(hash, expectedHash)
    deepStrictEqual(manifest.meta, meta)
  })

  it('throws an error if storage is not specified', async () => {
    let err

    try {
      await Manifest({})
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, 'Error: storage is required')
  })

  it('throws an error if name is not specified', async () => {
    let err

    try {
      await Manifest({ storage })
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, 'Error: name is required')
  })

  it('throws an error if type is not specified', async () => {
    let err

    try {
      await Manifest({ storage, name: 'manifest' })
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, 'Error: type is required')
  })

  it('throws an error if accessController is not specified', async () => {
    let err

    try {
      await Manifest({ storage, name: 'manifest', type: 'manifest' })
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, 'Error: accessController is required')
  })
})
