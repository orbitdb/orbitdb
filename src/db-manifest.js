import path from 'path'
import * as io from 'orbit-db-io'

// Creates a DB manifest file and saves it in IPFS
export default async (ipfs, name, type, accessControllerAddress, options) => {
  const manifest = Object.assign({
    name,
    type,
    accessController: (path.posix || path).join('/ipfs', accessControllerAddress)
  },
  // meta field is only added to manifest if options.meta is defined
  options.meta !== undefined ? { meta: options.meta } : {}
  )

  return io.write(ipfs, options.format || 'dag-cbor', manifest, options)
}
