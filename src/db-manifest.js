const path = require('path')

// Creates a DB manifest file and saves it in IPFS
const createDBManifest = async (ipfs, name, type, accessControllerAddress) => {
  const manifest = {
    name: name,
    type: type,
    accessController: path.join('/ipfs', accessControllerAddress),
  }
  const dag = await ipfs.object.put(Buffer.from(JSON.stringify(manifest)))
  return dag.toJSON().multihash.toString()
}

module.exports = createDBManifest
