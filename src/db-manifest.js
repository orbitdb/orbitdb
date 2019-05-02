const path = require('path')
const io = require('orbit-db-io')

// Creates a DB manifest file and saves it in IPFS
const createDBManifest = async (ipfs, name, type, accessControllerAddress, onlyHash, legacy) => {
  const manifest = {
    name: name,
    type: type,
    accessController: path.join('/ipfs', accessControllerAddress),
  }
  const codec = legacy ? 'dag-pb' : 'dag-cbor'

  return io.write(ipfs, codec, manifest, { onlyHash })
}

module.exports = createDBManifest
