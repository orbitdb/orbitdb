import { strictEqual, deepStrictEqual } from 'assert'
import rmrf from 'rimraf'
import * as IPFS from 'ipfs-core'
import Manifests from '../src/manifest.js'
import config from './config.js'

describe('Manifest', () => {
  const repo = './ipfs'
  let ipfs
  let manifests

  before(async () => {
    ipfs = await IPFS.create({ ...config.daemon1, repo })
    manifests = await Manifests({ ipfs })
  })

  after(async () => {
    await manifests.close()
    await ipfs.stop()
    await rmrf(repo)
  })

  it('creates a manifest', async () => {
    const name = 'database'
    const type = 'keyvalue'
    const accessController = 'test/default-access-controller'
    const expectedHash = 'zdpuAn26ookFToGNmpVHgEM71YMULiyS8mAs9UQtV1g6eEyRP'
    const expectedManifest = {
      name,
      type,
      accessController
    }

    const { hash, manifest } = await manifests.create({ name, type, accessController })

    strictEqual(hash, expectedHash)
    deepStrictEqual(manifest, expectedManifest)
  })

  it('loads a manifest', async () => {
    const name = 'database'
    const type = 'keyvalue'
    const accessController = 'test/default-access-controller'
    const expectedHash = 'zdpuAn26ookFToGNmpVHgEM71YMULiyS8mAs9UQtV1g6eEyRP'
    const expectedManifest = {
      name,
      type,
      accessController
    }

    const manifest = await manifests.get(expectedHash)

    deepStrictEqual(manifest, expectedManifest)
  })

  it('creates a manifest with metadata', async () => {
    const name = 'database'
    const type = 'keyvalue'
    const accessController = 'test/default-access-controller'
    const expectedHash = 'zdpuAyWPs4yAXS6W7CY4UM68pV2NCpzAJr98aMA4zS5XRq5ga'
    const meta = { name, description: 'more information about the database' }

    const { hash, manifest } = await manifests.create({ name, type, accessController, meta })

    strictEqual(hash, expectedHash)
    deepStrictEqual(manifest.meta, meta)
  })

  it('throws an error if name is not specified', async () => {
    let err

    try {
      await manifests.create({})
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, 'Error: name is required')
  })

  it('throws an error if type is not specified', async () => {
    let err

    try {
      await manifests.create({ name: 'database' })
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, 'Error: type is required')
  })

  it('throws an error if accessController is not specified', async () => {
    let err

    try {
      await manifests.create({ name: 'database', type: 'keyvalue' })
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, 'Error: accessController is required')
  })
})
