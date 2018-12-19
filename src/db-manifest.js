const path = require('path')
const { DAGNode, util } = require('ipld-dag-pb')

// Creates a DB manifest file and saves it in IPFS
const createDBManifest = async (ipfs, name, type, accessControllerAddress, onlyHash) => {
  const manifest = {
    name: name,
    type: type,
    accessController: path.join('/ipfs', accessControllerAddress),
  }
  let cid, hash
  const manifestJSON = JSON.stringify(manifest)
  if (onlyHash) {
    // const dag = await new Promise(resolve => {
    //   DAGNode.create(Buffer.from(manifestJSON), (err, n) => {
    //     if (err) {
    //       throw err
    //     }
    //     resolve(n)
    //   })
    // })
    cid = await new Promise(resolve => {
      // util.serialize(manifestJSON), (err, node) => {
      //   if (err) {
      //     throw err
      //   }
      //   util.cid(node, { version: 1 }, (err, node) => {
      //     if (err) {
      //       throw err
      //     }
      //     resolve(node)
      //   })
      // })
      util.cid(manifestJSON, { version: 1 }, (err, node) => {
        if (err) {
          throw err
        }
        resolve(node)
      })
    })
  } else {
    cid = await ipfs.dag.put(Buffer.from(manifestJSON))
  }
  return cid.toBaseEncodedString()
}

module.exports = createDBManifest
