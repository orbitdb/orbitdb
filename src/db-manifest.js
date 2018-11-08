const path = require('path')

const encodeManifest = manifest => Buffer.from(JSON.stringify(manifest))

// Creates a DB manifest file and saves it in IPFS
const createDBManifest = (name, type, accessControllerAddress, identity) => {
  const { orbitKey } = identity
  const owner = orbitKey.getPublic('hex')
  return {
    name,
    type,
    owner,
    accessController: path.join('/ipfs', accessControllerAddress),
  }
}

const uploadDBManifest = async (ipfs, manifest) => {
  console.log('uploading manifest:', manifest)
  const dag = await ipfs.object.put(encodeManifest(manifest))
  return dag.toJSON().multihash.toString()
}

const signDBManifest = async (manifest, identity, identityProvider) => {
  console.log('signing manifest:', manifest)
  return identityProvider.sign(identity, encodeManifest(manifest))
}

const verifyDBManifest = async (manifest, signature, identityProvider) => {
  console.log('verifying manifest:', manifest)
  const { owner } = manifest
  return identityProvider.verify(signature, owner, encodeManifest(manifest))
}

module.exports.createDBManifest = createDBManifest
module.exports.uploadDBManifest = uploadDBManifest
module.exports.signDBManifest = signDBManifest
module.exports.verifyDBManifest = verifyDBManifest
