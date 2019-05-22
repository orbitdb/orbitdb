const io = require('orbit-db-io')

// Creates a DB manifest file and saves it in IPFS
const createDBManifest = async (ipfs, name, type, accessControllerAddress, options) => {
  const manifest = {
    name: name,
    type: type,
    accessController: ['/ipfs', accessControllerAddress].join('/'),
  }

  return io.write(ipfs, options.format || 'dag-cbor', manifest, options)
}

module.exports = createDBManifest
