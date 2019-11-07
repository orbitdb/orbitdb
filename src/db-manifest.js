const path = require('path')
const io = require('orbit-db-io')

// Creates a DB manifest file and saves it in IPFS
const createDBManifest = async (ipfs, name, type, accessControllerAddress, options) => {
  const manifest = Object.assign({
    name: name,
    type: type,
    accessController: (path.posix || path).join('/ipfs', accessControllerAddress)
  },
  // meta field is only added to manifest if options.meta is defined
  options.meta !== undefined ? { meta: options.meta } : {}
  )

  return io.write(ipfs, options.format || 'dag-cbor', manifest, options)
}

module.exports = createDBManifest
