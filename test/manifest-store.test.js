import { strictEqual, deepStrictEqual } from 'assert'
import { rimraf } from 'rimraf'
import ManifestStore from '../src/manifest-store.js'
import createHelia from './utils/create-helia.js'

describe('Manifest', () => {
  const repo = './ipfs'
  let ipfs
  let manifestStore

  before(async () => {
    ipfs = await createHelia()
    manifestStore = await ManifestStore({ ipfs })
  })

  after(async () => {
    await manifestStore.close()
    await ipfs.stop()
    await rimraf(repo)
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

    const { hash, manifest } = await manifestStore.create({ name, type, accessController })

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

    const manifest = await manifestStore.get(expectedHash)

    deepStrictEqual(manifest, expectedManifest)
  })

  it('creates a manifest with metadata', async () => {
    const name = 'database'
    const type = 'keyvalue'
    const accessController = 'test/default-access-controller'
    const expectedHash = 'zdpuAyWPs4yAXS6W7CY4UM68pV2NCpzAJr98aMA4zS5XRq5ga'
    const meta = { name, description: 'more information about the database' }

    const { hash, manifest } = await manifestStore.create({ name, type, accessController, meta })

    strictEqual(hash, expectedHash)
    deepStrictEqual(manifest.meta, meta)
  })

  it('throws an error if name is not specified', async () => {
    let err

    try {
      await manifestStore.create({})
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, 'Error: name is required')
  })

  it('throws an error if type is not specified', async () => {
    let err

    try {
      await manifestStore.create({ name: 'database' })
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, 'Error: type is required')
  })

  it('throws an error if accessController is not specified', async () => {
    let err

    try {
      await manifestStore.create({ name: 'database', type: 'keyvalue' })
    } catch (e) {
      err = e.toString()
    }

    strictEqual(err, 'Error: accessController is required')
  })
})
