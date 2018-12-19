const path = require('path')

// Creates a DB manifest file and saves it in IPFS
const createDBManifest = async (ipfs, name, type, accessControllerAddress, onlyHash) => {
  const manifest = {
    name: name,
    type: type,
    accessController: path.join('/ipfs', accessControllerAddress),
  }

  const data = Buffer.from(JSON.stringify(manifest))

  const cid = await ipfs.dag.put(data, { 
    version: 1, 
    onlyHash: onlyHash || false 
  })

  return cid.toBaseEncodedString()
}

module.exports = createDBManifest
