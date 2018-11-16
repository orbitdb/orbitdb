const encodeManifest = manifest => Buffer.from(JSON.stringify(manifest))

// Creates a DB manifest file and saves it in IPFS
const createDBManifest = (name, type, accessControllerAddress, publicKey) => {
  return {
    name,
    type,
    owner: publicKey,
    accessController: accessControllerAddress,
  }
}

const uploadDBManifest = async (ipfs, manifest) => {
  const dag = await ipfs.object.put(encodeManifest(manifest))
  return dag.toJSON().multihash.toString()
}

const signDBManifest = async (manifest, identity, identityProvider) => {
  return identityProvider.sign(identity, encodeManifest(manifest))
}

const verifyDBManifest = async (manifest, signature, identityProvider) => {
  const { owner } = manifest
  return identityProvider.verify(signature, owner, encodeManifest(manifest))
}

module.exports = {
  createDBManifest,
  uploadDBManifest,
  signDBManifest,
  verifyDBManifest
}
