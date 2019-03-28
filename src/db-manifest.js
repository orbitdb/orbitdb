
const { DAGNode } = require('ipld-dag-pb')

const encodeManifest = manifest => Buffer.from(JSON.stringify(manifest))
const createDAGNode = obj => new Promise((resolve, reject) => {
  DAGNode.create(obj, (err, node) => {
    if (err) return reject(err)
    return resolve(node);
  })
});

// Creates a DB manifest file and saves it in IPFS
const createDBManifest = (name, type, accessControllerAddress, publicKey) => {
  return {
    name,
    type,
    owner: publicKey,
    accessController: accessControllerAddress,
  }
}

const getManifestHash = async (manifest) => {
  const dag = await createDAGNode(encodeManifest(manifest))
  return dag.toJSON().multihash.toString()
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
  getManifestHash,
  uploadDBManifest,
  signDBManifest,
  verifyDBManifest
}
