const path = require('path')
const io = require('orbit-db-io')

// Creates a DB manifest file and saves it in IPFS
const createDBManifest = async (ipfs, name, type, accessControllerAddress, onlyHash) => {
  const manifest = {
    name: name,
    type: type,
    accessController: path.join('/ipfs', accessControllerAddress),
  }

  return io.write(ipfs, 'dag-cbor', manifest, { onlyHash })
}

module.exports = createDBManifest
