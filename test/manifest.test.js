import { strictEqual, deepStrictEqual } from 'assert'
import path from 'path'
import rmrf from 'rimraf'
import * as IPFS from 'ipfs'
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
    const type = 'manifest-test'
    const accessController = '123'
    const expectedHash = 'zdpuAtUvd7EhN9Xu2KSCxkjG1oS1SN6EnnZ8sxvJMPiJhbQWF'
    const expectedManifest = {
      name,
      type,
      accessController: path.join('/ipfs', accessController)
    }

    const { hash, manifest } = await Manifest(storage, name, type, accessController)

    strictEqual(hash, expectedHash)
    deepStrictEqual(manifest, expectedManifest)
  })

  it('creates a manifest with metadata', async () => {
    const name = 'manifest'
    const type = 'manifest-test'
    const accessController = '123'
    const expectedHash = 'zdpuAmNAMNnzKJ2kWgo4H42ZDG7nFCSGEWtV76UvL5dWrNweQ'
    const meta = { name, type, description: 'more information about the database' }

    const { hash, manifest } = await Manifest(storage, name, type, accessController, { meta })

    strictEqual(hash, expectedHash)
    deepStrictEqual(manifest.meta, meta)
  })

  it('throws an error if storage is not specified', async () => {
    let err

    try {
      await Manifest()
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, 'Error: storage is required')
  })

  it('throws an error if name is not specified', async () => {
    let err

    try {
      await Manifest(storage)
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, 'Error: name is required')
  })

  it('throws an error if type is not specified', async () => {
    let err

    try {
      await Manifest(storage, 'manifest')
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, 'Error: type is required')
  })

  it('throws an error if accessControllerAddress is not specified', async () => {
    let err

    try {
      await Manifest(storage, 'manifest', 'manifest-test')
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, 'Error: accessControllerAddress is required')
  })
})
