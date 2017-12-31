const path = require('path')

// Creates a DB manifest file and saves it in IPFS
const createDBManifest = async (ipfs, name, type, accessControllerAddress) => {
  // Manifest file is the following field:
  const manifest = {
    name: name,
    type: type,
    accessController: accessControllerAddress,
  }
  // Persist in IPFS
  const dag = await ipfs.object.put(Buffer.from(JSON.stringify(manifest)))
  // Return the Multihash to the object
  return dag.toJSON().multihash.toString()
}

module.exports = createDBManifest
